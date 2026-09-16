// Static capability analysis of npm-published MCP servers.
//
// People install these servers — which then run with their credentials, on
// their machine — on the strength of a README. This reads the published source
// and reports, with evidence, which platform capabilities it reaches for.
//
// Three rules shape everything here, because we are making public statements
// about other people's code:
//
//   1. DESCRIPTIVE, NEVER JUDGMENTAL. We report "imports child_process" and
//      cite the file and line. We never say "unsafe", "malicious" or "risky".
//      A filesystem server reading files is the product working, not a finding.
//   2. EVIDENCE OR SILENCE. Every capability carries file:line so a reader (or
//      the maintainer) can check it. No evidence, no claim.
//   3. ABSENCE PROVES NOTHING. Dynamic requires, eval, obfuscation and
//      dependency code are all invisible here. The UI must say so — this
//      cannot be read as a clean bill of health.
//
// Scope limit worth stating loudly: an npm tarball contains only the package's
// OWN files. Dependencies are separate packages and are NOT analyzed, so the
// most interesting place for something to hide is exactly where we cannot see.

import { parse } from "acorn";
import * as walk from "acorn-walk";
import { log, sleep } from "./util.mjs";
import { extractTarball, fetchTarball } from "./tarball.mjs";

const CONCURRENCY = 4;
const MAX_FILES = 80;
const MAX_EVIDENCE_PER_CAPABILITY = 4;

/**
 * Node builtins mapped to the capability they represent. Keys are matched
 * against resolved module specifiers, with `node:` prefixes normalized.
 */
const MODULE_CAPABILITIES = {
  child_process: "exec",
  fs: "filesystem",
  "fs/promises": "filesystem",
  net: "network",
  tls: "network",
  http: "network",
  https: "network",
  http2: "network",
  dgram: "network",
  dns: "network",
  os: "system",
  v8: "system",
  vm: "dynamic-code",
  worker_threads: "spawn",
  cluster: "spawn",
};

/** Bare globals whose use implies a capability. */
const GLOBAL_CALLS = {
  fetch: "network",
  eval: "dynamic-code",
};

export const CAPABILITY_ORDER = [
  "exec",
  "filesystem",
  "network",
  "dynamic-code",
  "spawn",
  "env",
  "system",
];

const SOURCE_FILE = /\.(mjs|cjs|js)$/i;
const IGNORED_PATH =
  /(^|\/)(node_modules|test|tests|__tests__|spec|examples?|docs?|coverage|fixtures?)\//i;
const IGNORED_FILE = /\.(min|test|spec)\.[cm]?js$/i;

function normalizeSpecifier(raw) {
  if (typeof raw !== "string") return null;
  return raw.startsWith("node:") ? raw.slice(5) : raw;
}

/** Acorn needs a module/script decision; try module first, fall back. */
function parseSource(code) {
  for (const sourceType of ["module", "script"]) {
    try {
      return parse(code, {
        ecmaVersion: "latest",
        sourceType,
        allowHashBang: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        locations: true,
      });
    } catch {
      /* try the other form */
    }
  }
  return null;
}

/**
 * Is this file a bundle rather than hand-written source?
 *
 * Matters for attribution, not for whether the capability is real. A bundled
 * file inlines its dependencies, so a `child_process` import inside one may
 * belong to a library the author pulled in — one package here ships 617KB
 * across 140 lines, where the flagged line is ajv's validator internals.
 * The capability genuinely ships and genuinely runs; what we cannot say is
 * that the author wrote it.
 */
function looksBundled(code) {
  const lines = code.split("\n");
  if (lines.length === 0) return false;
  const longest = lines.reduce((max, l) => (l.length > max ? l.length : max), 0);
  return longest > 2000 || code.length / lines.length > 400;
}

function addFinding(findings, capability, path, node, detail, bundled) {
  const list = (findings[capability] ??= []);
  if (list.length >= MAX_EVIDENCE_PER_CAPABILITY) return;
  // One line per capability per file is plenty; repeats add noise, not proof.
  if (list.some((f) => f.file === path && f.detail === detail)) return;
  list.push({ file: path, line: node.loc?.start.line ?? 0, detail, bundled });
}

function scanFile(path, code, findings) {
  const ast = parseSource(code);
  if (!ast) return null;

  const bundled = looksBundled(code);

  const noteModule = (specifier, node) => {
    const spec = normalizeSpecifier(specifier);
    if (!spec) return;
    const capability = MODULE_CAPABILITIES[spec];
    if (capability) addFinding(findings, capability, path, node, `imports ${spec}`, bundled);
  };

  walk.simple(ast, {
    ImportDeclaration(node) {
      noteModule(node.source?.value, node);
    },
    ImportExpression(node) {
      if (node.source?.type === "Literal") noteModule(node.source.value, node);
    },
    CallExpression(node) {
      const callee = node.callee;

      // require("child_process")
      if (callee.type === "Identifier" && callee.name === "require") {
        const arg = node.arguments[0];
        if (arg?.type === "Literal") noteModule(arg.value, node);
        return;
      }

      // fetch(...), eval(...)
      if (callee.type === "Identifier" && GLOBAL_CALLS[callee.name]) {
        addFinding(findings, GLOBAL_CALLS[callee.name], path, node, `calls ${callee.name}()`, bundled);
        return;
      }

      // process.binding / process.dlopen are lower-level escapes worth naming.
      if (
        callee.type === "MemberExpression" &&
        callee.object?.type === "Identifier" &&
        callee.object.name === "process" &&
        ["binding", "dlopen"].includes(callee.property?.name)
      ) {
        addFinding(findings, "dynamic-code", path, node, `calls process.${callee.property.name}()`, bundled);
      }
    },
    NewExpression(node) {
      if (node.callee?.type === "Identifier" && node.callee.name === "Function") {
        addFinding(findings, "dynamic-code", path, node, "constructs new Function()", bundled);
      }
    },
    MemberExpression(node) {
      // process.env — reading configuration, and also how secrets are read.
      if (
        node.object?.type === "Identifier" &&
        node.object.name === "process" &&
        node.property?.name === "env"
      ) {
        addFinding(findings, "env", path, node, "reads process.env", bundled);
      }
    },
  });

  return { bundled };
}

/**
 * Inspect one npm package version.
 * @returns {Promise<object|null>} capability report, or null if unavailable
 */
export async function inspectNpmPackage({ name, version, tarball }) {
  const gz = await fetchTarball(tarball);
  if (!gz) return null;

  let files;
  try {
    files = extractTarball(gz, (p) => SOURCE_FILE.test(p) && !IGNORED_PATH.test(p) && !IGNORED_FILE.test(p));
  } catch {
    return null;
  }

  // Largest first: in a bundled package the entry point carries the behaviour.
  files.sort((a, b) => b.contents.length - a.contents.length);
  const considered = files.slice(0, MAX_FILES);

  const findings = {};
  let parsed = 0;
  let bundledFiles = 0;
  for (const file of considered) {
    const result = scanFile(file.path, file.contents, findings);
    if (!result) continue;
    parsed++;
    if (result.bundled) bundledFiles++;
  }

  if (considered.length === 0) {
    return {
      name,
      version,
      status: "no-source",
      filesScanned: 0,
      filesTotal: files.length,
      capabilities: [],
    };
  }

  return {
    name,
    version,
    // "partial" when some files failed to parse, so the UI can say so rather
    // than implying the absence of a capability was verified.
    status: parsed === considered.length ? "ok" : "partial",
    filesScanned: parsed,
    filesTotal: files.length,
    // Surfaced so the UI can soften attribution rather than implying the
    // author wrote everything the bundle contains.
    bundledFiles,
    capabilities: CAPABILITY_ORDER.filter((c) => findings[c]?.length).map((c) => ({
      id: c,
      evidence: findings[c],
    })),
  };
}

/** Signals available from the registry without reading any code. */
export function publisherSignals(packument, version) {
  const ver = packument?.versions?.[version] ?? {};
  const scripts = ver.scripts ?? {};
  const installHooks = ["preinstall", "install", "postinstall"].filter((h) => scripts[h]);

  const trusted = ver._npmUser?.trustedPublisher ?? null;

  return {
    maintainers: (packument?.maintainers ?? []).length || null,
    publishedBy: ver._npmUser?.name ?? null,
    // npm's trusted publishing: the release came from a verified CI identity
    // rather than a personal token.
    trustedPublisher: trusted ? (trusted.id ?? "verified") : null,
    // SLSA provenance attestation linking the artifact to its source commit.
    provenance: !!ver.dist?.attestations?.provenance,
    signed: Array.isArray(ver.dist?.signatures) && ver.dist.signatures.length > 0,
    // Install hooks run automatically on `npm install`, before any of the
    // package's own code is deliberately invoked.
    installScripts: installHooks.length ? installHooks : null,
    unpackedSize: ver.dist?.unpackedSize ?? null,
    fileCount: ver.dist?.fileCount ?? null,
  };
}

/**
 * Analyze every npm-packaged server in place, writing an `inspection` block.
 *
 * Only npm packages are covered: PyPI and OCI would each need their own
 * fetcher and parser, and remote servers have no code to read at all.
 * Set SKIP_INSPECT=1 to bypass during local iteration.
 */
export async function attachInspections(servers, packuments) {
  if (process.env.SKIP_INSPECT === "1") {
    log("inspection: skipped (SKIP_INSPECT=1)");
    return servers;
  }

  const targets = [];
  for (const server of servers) {
    const pkg = server.packages.find((p) => (p.registryType || "").toLowerCase() === "npm");
    if (!pkg) continue;
    const packument = packuments.get(pkg.identifier);
    const version = packument?.["dist-tags"]?.latest;
    const tarball = version ? packument.versions?.[version]?.dist?.tarball : null;
    if (!tarball) continue;
    targets.push({ server, pkg, packument, version, tarball });
  }

  let analyzed = 0;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ server, pkg, packument, version, tarball }) => {
        const report = await inspectNpmPackage({ name: pkg.identifier, version, tarball }).catch(() => null);
        const signals = publisherSignals(packument, version);
        if (report) analyzed++;
        server.inspection = {
          ...(report ?? { name: pkg.identifier, version, status: "unavailable", capabilities: [] }),
          ...signals,
          analyzedAt: new Date().toISOString(),
        };
      }),
    );
    if (i + CONCURRENCY < targets.length) await sleep(120);
  }

  log(`inspection: analyzed ${analyzed}/${targets.length} npm packages`);
  return servers;
}
