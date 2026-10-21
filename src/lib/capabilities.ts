import type { CapabilityId, Inspection, Mcp } from "./types";

/**
 * Plain-English rendering of what static analysis observed in a package.
 *
 * The wording here is the whole point of the feature, and it is deliberately
 * constrained:
 *
 *   - **Descriptive, never judgmental.** "Can run other programs", not
 *     "dangerous". A filesystem server reading files is the product working.
 *     The reader decides whether a capability is appropriate for what they
 *     asked the server to do; we only say what is there.
 *   - **Observed, not inferred.** Every line traces to a file and line number
 *     in the published tarball.
 *   - **Never a safety claim.** See LIMITATIONS — absence of a capability here
 *     is not evidence of its absence in reality.
 */

export interface CapabilityCopy {
  label: string;
  /** What it means for the person installing it, in one sentence. */
  plain: string;
  /** Rendered in the aggregate summary line. */
  summary: string;
  /** Attention-worthiness, NOT a safety rating. Drives ordering and tone. */
  weight: "high" | "medium" | "low";
}

export const CAPABILITY_COPY: Record<CapabilityId, CapabilityCopy> = {
  exec: {
    label: "Runs other programs",
    plain:
      "Imports Node's child_process module, which starts other programs on your machine with your user's permissions.",
    summary: "run other programs on your machine",
    weight: "high",
  },
  "dynamic-code": {
    label: "Executes code built at runtime",
    plain:
      "Uses eval, new Function or the vm module, so some of what it runs is assembled while it runs rather than being visible in the published source.",
    summary: "execute code it builds at runtime",
    weight: "high",
  },
  filesystem: {
    label: "Reads and writes files",
    plain:
      "Imports Node's fs module. Nothing in the package limits this to a particular folder — scoping is whatever you configure when you launch it.",
    summary: "read and write files",
    weight: "high",
  },
  spawn: {
    label: "Starts background workers",
    plain: "Uses worker_threads or cluster to run code in additional processes or threads.",
    summary: "start background workers",
    weight: "medium",
  },
  network: {
    label: "Makes network requests",
    plain:
      "Opens network connections or calls fetch, so data it handles can leave your machine and it can pull data in.",
    summary: "make network requests",
    weight: "medium",
  },
  env: {
    label: "Reads environment variables",
    plain:
      "Reads process.env. That is how it picks up the API keys you configure — and it is not restricted to only those variables.",
    summary: "read your environment variables",
    weight: "low",
  },
  system: {
    label: "Reads system information",
    plain: "Imports os or v8 to read machine details such as hostname, platform or home directory.",
    summary: "read system information",
    weight: "low",
  },
};

const WEIGHT_ORDER: Record<CapabilityCopy["weight"], number> = { high: 0, medium: 1, low: 2 };

/**
 * What this analysis cannot see. Rendered verbatim next to every report,
 * because a capability list without them reads as a clean bill of health.
 */
export const LIMITATIONS = [
  "Only the package's own files are read. Its dependencies are separate packages and are not analyzed — which is exactly where something would hide.",
  "Where a package ships bundled code, its dependencies are inlined into those files. The capability is really there and really runs, but it may come from a library rather than anything the author wrote.",
  "Code assembled at runtime, dynamic imports and obfuscated code are invisible to a static read.",
  "A capability appearing here is not a finding. A filesystem server reading files is the product working as described.",
  "This is not a security audit and says nothing about intent. It reports what the published source reaches for, with the file and line, so you can check it yourself.",
];

export interface CapabilitySummary {
  /** e.g. "This server can run other programs on your machine and read and write files." */
  sentence: string;
  capabilities: { id: CapabilityId; copy: CapabilityCopy; evidence: Inspection["capabilities"][number]["evidence"] }[];
  /** Registry-level signals that need no code reading. */
  publisher: {
    trustedPublisher: string | null;
    provenance: boolean;
    signed: boolean;
    maintainers: number | null;
    publishedBy: string | null;
    installScripts: string[] | null;
  };
  status: Inspection["status"];
  coverage: string | null;
  /**
   * True when every observation came from bundled files. The capabilities are
   * real — that bundle is what executes — but they cannot be attributed to the
   * author, so the UI says "the code it ships" rather than "this server".
   */
  bundledOnly: boolean;
  /** Some, but not all, observations came from bundles. */
  hasBundled: boolean;
}

function joinClauses(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function summarizeCapabilities(mcp: Mcp): CapabilitySummary | null {
  const inspection = mcp.inspection;
  if (!inspection) return null;

  const capabilities = [...inspection.capabilities]
    .filter((c) => CAPABILITY_COPY[c.id])
    .sort((a, b) => WEIGHT_ORDER[CAPABILITY_COPY[a.id].weight] - WEIGHT_ORDER[CAPABILITY_COPY[b.id].weight])
    .map((c) => ({ id: c.id, copy: CAPABILITY_COPY[c.id], evidence: c.evidence }));

  // Lead with the two or three that matter most; the full list is below it.
  const headline = capabilities.slice(0, 3).map((c) => c.copy.summary);

  const allEvidence = capabilities.flatMap((c) => c.evidence);
  const bundledOnly = allEvidence.length > 0 && allEvidence.every((e) => e.bundled);
  const hasBundled = allEvidence.some((e) => e.bundled);

  // Attribution, not hedging: a bundle inlines its dependencies, so the code
  // genuinely does this — we just cannot say the author wrote it.
  const subject = bundledOnly ? "The code this server ships" : "This server";

  const sentence =
    capabilities.length === 0
      ? inspection.status === "ok"
        ? "Nothing in this package's own source reaches for the filesystem, the network, or other programs."
        : "No capabilities were observed, but the source could not be fully read — treat this as unknown rather than none."
      : `${subject} can ${joinClauses(headline)}.`;

  return {
    sentence,
    capabilities,
    publisher: {
      trustedPublisher: inspection.trustedPublisher,
      provenance: inspection.provenance,
      signed: inspection.signed,
      maintainers: inspection.maintainers,
      publishedBy: inspection.publishedBy,
      installScripts: inspection.installScripts,
    },
    bundledOnly,
    hasBundled,
    status: inspection.status,
    coverage:
      inspection.filesScanned != null && inspection.filesTotal != null
        ? `${inspection.filesScanned} of ${inspection.filesTotal} source file${inspection.filesTotal === 1 ? "" : "s"}`
        : null,
  };
}

/**
 * Why a server has no analysis. Remote servers have no code to read at all;
 * PyPI and OCI packages need a different parser than a JavaScript one.
 */
export function inspectionUnavailableReason(mcp: Mcp): string {
  if (mcp.packages.length === 0) {
    return mcp.remotes.length > 0
      ? "This is a remote server — nothing is installed or run on your machine, so there is no local code to analyze. What it can reach is described above: your requests go to the provider's host."
      : "This registry entry publishes neither a package nor an endpoint, so there is nothing to analyze.";
  }

  const kinds = [...new Set(mcp.packages.map((p) => (p.registryType || "").toLowerCase()))];
  if (kinds.includes("pypi")) {
    return "Source analysis currently covers npm packages only. This server ships as a Python package, which needs a different parser.";
  }
  if (kinds.includes("oci")) {
    return "Source analysis currently covers npm packages only. This server ships as a container image, whose contents are not readable the same way.";
  }
  return "The published package could not be downloaded or read for analysis.";
}
