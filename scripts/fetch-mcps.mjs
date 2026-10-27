// Fetch MCP servers from the official MCP Registry + Glama, normalize, dedupe.
// Docs verified: registry.modelcontextprotocol.io/v0/servers (public, no auth),
// glama.ai/api/mcp/v1/servers (now requires a bearer token; set GLAMA_API_KEY
// to enable it — without the key that source is skipped, not fatal).

import { getJSON, slugify, clean, categorize, log, sleep } from "./lib/util.mjs";
import { attachRepoMeta } from "./lib/github.mjs";
import { resolveNpmPackages } from "./lib/npm.mjs";
import { attachInspections } from "./lib/inspect-package.mjs";
import { fetchReferenceMCPs } from "./fetch-reference-mcps.mjs";
import { fetchCuratedMCPs } from "./curated-mcps.mjs";
import { attachTools } from "./lib/mcp-probe.mjs";
import { attachReadmes } from "./lib/readme.mjs";
import { repoSlugFromUrl } from "./lib/github.mjs";

const MCP_CATEGORIES = [
  { name: "Databases & Storage", keys: ["postgres", "mysql", "sqlite", "database", "mongodb", "redis", "supabase", "duckdb", "s3", "storage", "sql", "bigquery", "snowflake"] },
  { name: "Dev Tools & Git", keys: ["github", "gitlab", "git ", "docker", "kubernetes", "ci/cd", "jira", "sentry", "terminal", "shell", "code", "compiler", "npm", "linter"] },
  { name: "Web & Search", keys: ["search", "browser", "puppeteer", "playwright", "scrape", "crawl", "fetch", "web", "google", "brave", "perplexity", "tavily"] },
  { name: "Productivity", keys: ["notion", "slack", "linear", "calendar", "gmail", "email", "todo", "task", "asana", "trello", "obsidian", "confluence"] },
  { name: "AI & Memory", keys: ["memory", "vector", "embedding", "rag", "knowledge", "llm", "openai", "anthropic", "agent", "reasoning"] },
  { name: "Cloud & DevOps", keys: ["aws", "azure", "gcp", "cloud", "vercel", "netlify", "cloudflare", "deploy", "infrastructure", "monitoring"] },
  { name: "Finance & Data", keys: ["stripe", "payment", "finance", "crypto", "stock", "market", "analytics", "csv", "excel", "spreadsheet"] },
  { name: "Design & Media", keys: ["figma", "image", "video", "audio", "design", "canva", "screenshot", "pdf", "media"] },
  // The registry's long tail is mostly vertical/business servers. Without
  // these buckets ~30% of the catalog collapsed into "Other".
  { name: "Docs & Knowledge", keys: ["documentation", "docs", "markdown", "wiki", "note", "knowledge base", "content", "article", "blog", "readme", "reference"] },
  { name: "Marketing & Social", keys: ["marketing", "seo", "campaign", "brand", "linkedin", "twitter", "social media", "ads", "advertis", "audience", "newsletter", "outreach"] },
  { name: "Commerce & Retail", keys: ["shopify", "ecommerce", "e-commerce", "product catalog", "pricing", "checkout", "order", "inventory", "storefront", "retail", "booking"] },
  { name: "Health & Science", keys: ["health", "medical", "clinical", "clinician", "patient", "biology", "genomic", "chemistry", "research paper", "pubmed", "scientific"] },
  { name: "Legal & Government", keys: ["legal", "compliance", "regulation", "government", "federal", "tax", "contract", "policy", "court", "law"] },
];

const catOf = (text) => categorize(text, MCP_CATEGORIES);

/**
 * Required launch arguments from the registry's `packageArguments`, with a
 * placeholder wherever the publisher gives only a hint. Optional arguments are
 * left out: the snippet should be the smallest config that starts. Without
 * these, servers that need e.g. a directory argument exit on first launch.
 */
function normalizeArgs(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const a of list.slice(0, 12)) {
    if (!a || !(a.isRequired === true || a.is_required === true)) continue;
    const hint = a.valueHint || a.value_hint || a.name;
    const value = a.value ?? a.default ?? (hint ? `<${hint}>` : null);
    if (a.type === "named" && a.name) {
      out.push(String(a.name));
      if (a.value ?? a.default ?? a.valueHint ?? a.value_hint) out.push(String(value));
    } else if (value) {
      out.push(String(value));
    }
  }
  return out;
}

/** Normalize the registry's env-var / header descriptors. */
function normalizeInputs(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((v) => v && v.name)
    .slice(0, 24)
    .map((v) => ({
      name: String(v.name),
      description: v.description ? clean(String(v.description), 240) : null,
      required: v.isRequired === true || v.is_required === true,
      secret: v.isSecret === true || v.is_secret === true,
      format: v.format || null,
    }));
}

// A lot of publishers name their registry entry after the protocol rather than
// the product, which left 13 different servers all displaying as "mcp". Fall
// back to the distinctive token in the reverse-DNS namespace.
const GENERIC_NAMES = new Set(["mcp", "server", "mcp-server", "mcpserver", "main", "app", "api"]);
const NAMESPACE_NOISE = new Set([
  "io", "com", "net", "org", "dev", "ai", "app", "sh", "co", "ac", "me", "xyz",
  "github", "gitlab", "cloud", "www",
]);

function displayName(title, qualifiedName) {
  const shortName = (qualifiedName || "").split("/").pop() || "";
  const candidate = (title || shortName || "").trim();
  if (candidate && !GENERIC_NAMES.has(candidate.toLowerCase())) return candidate;

  const token = (qualifiedName || "")
    .split("/")[0]
    .split(".")
    .filter((t) => t && !NAMESPACE_NOISE.has(t.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];

  if (!token) return candidate || shortName;
  // "agentgates" -> "Agentgates MCP", so the card says something.
  return `${token.charAt(0).toUpperCase()}${token.slice(1)} MCP`;
}

/**
 * How many registry entries the catalog keeps. Every page module imports the
 * catalog, so this is a build-size budget (~5 KB per server), not a fetch
 * limit: the whole registry is always read, then ranked and trimmed.
 */
const REGISTRY_KEEP = Number(process.env.REGISTRY_KEEP) || 500;
/** Safety stop for the pager — the registry is ~20k versions today. */
const REGISTRY_MAX_PAGES = 600;

/**
 * Servers people actually search for by name. Matching one is a strong signal
 * the entry belongs in the catalog even if it is thin on metadata.
 */
const PRIORITY_NAMES = [
  "github", "gitlab", "postgres", "mysql", "sqlite", "mongodb", "redis", "supabase", "neon", "playwright",
  "puppeteer", "browser", "context7", "notion", "slack", "linear", "jira", "atlassian", "sentry", "stripe",
  "figma", "docker", "kubernetes", "aws", "azure", "gcp", "cloudflare", "vercel", "firecrawl", "brave",
  "tavily", "exa", "perplexity", "memory", "filesystem", "obsidian", "google-drive", "gmail", "calendar",
];

/**
 * Rank registry entries before any per-item enrichment, using only what the
 * registry itself says. The previous `max = 220` stopped after the first
 * ~3 pages of an *alphabetical* feed, so every registry server in the catalog
 * started with "a" and GitHub, Postgres and Playwright never appeared.
 */
function registryScore(item) {
  // The server's own name — never the namespace. Matching the whole
  // qualifiedName let "github" hit every `io.github.<owner>/…` entry, which
  // filled the catalog with hundreds of unrelated GitHub-published servers.
  const own = `${item.qualifiedName.split("/").slice(1).join("/")} ${item.name}`.toLowerCase();
  let score = 0;
  if (PRIORITY_NAMES.some((p) => own.includes(p))) score += 6;
  if (/github\.com\//i.test(item.repository || "")) score += 3; // reviewable source
  else if (item.repository) score += 1;
  // Either way of running it is fine; having neither is not.
  if (item.packages.length || item.remotes.length) score += 2;
  if ((item.description || "").length >= 40) score += 1;
  if (/\b(test|testing|demo|example|hello[- ]?world|sample|template)\b/.test(own)) score -= 4;
  return score;
}

/** At most this many entries per registry namespace, so one publisher can't flood the catalog. */
const PER_NAMESPACE = 3;

/** Official MCP Registry — clean JSON, install/package metadata. */
async function fromOfficialRegistry(keep = REGISTRY_KEEP) {
  const out = [];
  let cursor = "";
  let pages = 0;
  try {
    while (pages++ < REGISTRY_MAX_PAGES) {
      const url = `https://registry.modelcontextprotocol.io/v0/servers?limit=100${cursor ? `&cursor=${cursor}` : ""}`;
      const data = await getJSON(url, { label: "mcp-registry" });
      const servers = data.servers || [];
      for (const entry of servers) {
        // Registry responses wrap each record as { server, _meta }; older
        // payloads were flat. Support both.
        const s = entry.server || entry;
        const meta = entry._meta?.["io.modelcontextprotocol.registry/official"] || s._meta || {};
        if (meta.status && meta.status !== "active") continue;
        if (meta.isLatest === false) continue;
        const desc = clean(s.description || "");
        out.push({
          id: `mcp:${slugify(s.name)}`,
          name: displayName(s.title, s.name),
          qualifiedName: s.name,
          slug: slugify(s.name),
          description: desc,
          category: catOf(`${s.name} ${desc}`),
          repository: s.repository?.url || null,
          homepage: s.websiteUrl || s.repository?.url || null,
          packages: (s.packages || []).map((p) => ({
            registryType: p.registryType || p.registry_type || null,
            identifier: p.identifier,
            version: p.version || "latest",
            transport: p.transport?.type || p.transport || "stdio",
            runtimeHint: p.runtimeHint || null,
            // The registry documents required credentials; we were dropping
            // them, which is exactly what a developer needs before installing.
            env: normalizeInputs(p.environmentVariables),
            args: normalizeArgs(p.packageArguments),
          })),
          remotes: (s.remotes || []).map((r) => ({
            type: r.type,
            url: r.url,
            headers: normalizeInputs(r.headers),
          })),
          stars: null,
          source: "MCP Registry",
          updatedAt: meta.publishedAt || meta.published_at || null,
        });
      }
      cursor = data.metadata?.nextCursor || data.metadata?.next_cursor || "";
      if (!cursor || servers.length === 0) break;
      await sleep(250);
    }
  } catch (err) {
    // A partial read is still better ranked than a truncated alphabetical one.
    log(`official registry failed after ${out.length} servers: ${err.message}`);
  }

  // One entry per slug (the feed can repeat a name across versions), then the
  // best-ranked `keep`, newest first within a score.
  const unique = [...new Map(out.map((s) => [s.slug, s])).values()];
  const perNamespace = new Map();
  const kept = unique
    .map((s) => ({ s, score: registryScore(s), t: s.updatedAt ? Date.parse(s.updatedAt) : 0 }))
    .sort((a, b) => b.score - a.score || b.t - a.t)
    .filter(({ s }) => {
      const ns = s.qualifiedName.split("/")[0];
      const n = perNamespace.get(ns) ?? 0;
      if (n >= PER_NAMESPACE) return false;
      perNamespace.set(ns, n + 1);
      return true;
    })
    .slice(0, keep)
    .map((x) => x.s);
  log(`official registry: ${unique.length} live servers read, ${kept.length} kept`);
  return kept;
}

/** Glama registry — adds tools/attributes/license enrichment. */
function glamaHeaders() {
  const key = process.env.GLAMA_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function fromGlama(max = 180) {
  if (!process.env.GLAMA_API_KEY) {
    log("glama: skipped (no GLAMA_API_KEY)");
    return [];
  }
  const out = [];
  let cursor = null;
  try {
    while (out.length < max) {
      const url = `https://glama.ai/api/mcp/v1/servers?first=100${cursor ? `&after=${cursor}` : ""}`;
      const data = await getJSON(url, { label: "glama", headers: glamaHeaders() });
      const servers = data.servers || [];
      for (const s of servers) {
        const desc = clean(s.description || "");
        const name = s.name || s.slug;
        out.push({
          id: `mcp:${slugify(s.slug || name)}`,
          name,
          qualifiedName: s.slug || slugify(name),
          slug: slugify(s.slug || name),
          description: desc,
          category: catOf(`${name} ${desc}`),
          repository: s.repository?.url || s.url || null,
          homepage: s.url || s.repository?.url || null,
          packages: [],
          remotes: [],
          // Objects, not bare names: the UI and alternativesTo read `.name`, so a
          // string array rendered every Glama tool as undefined.
          tools: (s.tools || [])
            .slice(0, 40)
            .filter((t) => t?.name)
            .map((t) => ({ name: t.name, description: t.description ? clean(t.description, 240) : null, inputs: null })),
          toolsSource: "glama",
          license: s.spdxLicense?.name || null,
          stars: null,
          source: "Glama",
          updatedAt: null,
        });
      }
      cursor = data.pageInfo?.endCursor;
      if (!cursor || !data.pageInfo?.hasNextPage || servers.length === 0) break;
      await sleep(250);
    }
    log(`glama: ${out.length} servers`);
  } catch (err) {
    log(`glama failed: ${err.message}`);
  }
  return out;
}

export async function fetchMCPs() {
  const [reference, curated, official, glama] = await Promise.all([
    fetchReferenceMCPs(),
    fetchCuratedMCPs(),
    fromOfficialRegistry(),
    fromGlama(),
  ]);
  // Dedupe by slug. Reference servers come first: they are the canonical
  // implementations and the ones people search for by name. Curated entries
  // follow, since they exist precisely to correct what the registry omits.
  const bySlug = new Map();
  for (const item of [...reference, ...curated, ...official, ...glama]) {
    const key = item.slug;
    if (!bySlug.has(key)) bySlug.set(key, item);
    else {
      const existing = bySlug.get(key);
      // Merge: keep official install data, borrow glama tools/license.
      bySlug.set(key, {
        ...existing,
        // `existing.tools || item.tools` never borrowed anything: `[]` is truthy.
        ...(existing.tools?.length ? {} : { tools: item.tools, toolsSource: item.toolsSource }),
        license: existing.license || item.license,
        description: existing.description || item.description,
      });
    }
  }
  const all = [...bySlug.values()].filter((m) => m.name && m.description);

  // Registries carry no popularity or maintenance signal; backfill both from
  // the linked repo. This also feeds the trust panel.
  await attachRepoMeta(all, (m) => m.repository || m.homepage);

  // Supply-chain data for the packaged (stdio) servers — these are the ones
  // that execute on the user's machine, so they warrant the extra lookup.
  const npmNames = all.flatMap((m) =>
    m.packages.filter((p) => (p.registryType || "").toLowerCase() === "npm").map((p) => p.identifier),
  );
  const npmMeta = await resolveNpmPackages(npmNames);
  for (const m of all) {
    for (const pkg of m.packages) {
      if ((pkg.registryType || "").toLowerCase() !== "npm") continue;
      const meta = npmMeta.get(pkg.identifier);
      if (!meta) continue;
      pkg.weeklyDownloads = meta.weeklyDownloads;
      pkg.lastPublished = meta.lastPublished;
      pkg.firstPublished = meta.firstPublished;
      pkg.deprecated = meta.deprecated;
      // Does the package point back at the same repo the registry advertises?
      // A mismatch is not proof of anything, but it is worth surfacing.
      pkg.declaredRepo = meta.declaredRepo;
      pkg.repoMatchesRegistry =
        meta.declaredRepo && m.repoMeta?.slug
          ? meta.declaredRepo.toLowerCase() === m.repoMeta.slug.toLowerCase()
          : null;
    }
  }

  // Read the published source of the packaged servers. These are the ones that
  // execute on the user's machine, so "what does this code reach for" is a
  // question worth answering with evidence rather than a README.
  const packuments = new Map(
    [...npmMeta.entries()].flatMap(([name, meta]) => (meta.packument ? [[name, meta.packument]] : [])),
  );
  await attachInspections(all, packuments);

  // Ask remote servers what they actually do. Packaged servers are skipped
  // deliberately — see lib/mcp-probe.mjs.
  await attachTools(all);

  // Real documentation beats a one-line registry blurb.
  // `subdir` scopes monorepo servers to their own folder: the seven reference
  // servers otherwise all rendered the same root README, with no tool list.
  await attachReadmes(all, (m) => repoSlugFromUrl(m.repository), (m) => m.subdir ?? null, { extractTools: true });

  log(`MCPs total after dedupe: ${all.length}`);
  return all;
}
