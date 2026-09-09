import type { Mcp } from "./types";
import { launchFor } from "./compat";

/**
 * A transparent health score for MCP servers.
 *
 * The whole formula is published on /health-score and rendered per component
 * on every server page, because an opaque number is worse than none: nobody
 * can tell whether a 62 means "risky" or "we couldn't check".
 *
 * Two rules keep it honest:
 *
 *  1. **Absence is not a penalty.** A component we could not measure is
 *     excluded from the denominator rather than scored zero. A server whose
 *     repo lookup failed is "insufficient data", never "unhealthy".
 *  2. **No safety claim.** This measures maintenance, adoption, transparency
 *     and packaging hygiene — things you can read off a repo and a registry.
 *     It says nothing about whether the code is malicious.
 */

export interface Component {
  id: string;
  label: string;
  /** Share of the total score this component can contribute. */
  weight: number;
  /** 0–1, or null when it could not be measured. */
  value: number | null;
  detail: string;
}

export interface Health {
  /** 0–100, or null when too little is known to be meaningful. */
  score: number | null;
  grade: "A" | "B" | "C" | "D" | null;
  /** Fraction of total weight actually measurable. */
  coverage: number;
  components: Component[];
}

const DAY = 86_400_000;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / DAY);
}

/** Map a value onto 0–1 with a log curve, so 10 → 100 matters more than 10k → 100k. */
function logScale(value: number, ceiling: number): number {
  if (value <= 0) return 0;
  return Math.min(1, Math.log10(1 + value) / Math.log10(1 + ceiling));
}

function maintenance(mcp: Mcp): Component {
  const days = daysSince(mcp.repoMeta?.pushedAt);
  const archived = mcp.repoMeta?.archived;

  if (archived) {
    return { id: "maintenance", label: "Maintenance", weight: 30, value: 0, detail: "Repository is archived." };
  }
  if (days === null) {
    return {
      id: "maintenance",
      label: "Maintenance",
      weight: 30,
      value: null,
      detail: "No commit history available.",
    };
  }

  // Full marks inside 30 days, decaying to zero at two years.
  const value = days <= 30 ? 1 : Math.max(0, 1 - (days - 30) / (730 - 30));
  return {
    id: "maintenance",
    label: "Maintenance",
    weight: 30,
    value,
    detail: `Last commit ${days} day${days === 1 ? "" : "s"} ago.`,
  };
}

function adoption(mcp: Mcp): Component {
  const stars = mcp.repoMeta?.stars ?? mcp.stars;
  const downloads = mcp.packages.find((p) => typeof p.weeklyDownloads === "number")?.weeklyDownloads;

  if (stars == null && downloads == null) {
    return { id: "adoption", label: "Adoption", weight: 20, value: null, detail: "No usage data available." };
  }

  const parts: number[] = [];
  const notes: string[] = [];
  if (stars != null) {
    parts.push(logScale(stars, 2000));
    notes.push(`${stars} stars`);
  }
  if (downloads != null) {
    parts.push(logScale(downloads, 20_000));
    notes.push(`${downloads} weekly downloads`);
  }

  return {
    id: "adoption",
    label: "Adoption",
    weight: 20,
    value: parts.reduce((a, b) => a + b, 0) / parts.length,
    detail: `${notes.join(", ")}.`,
  };
}

function transparency(mcp: Mcp): Component {
  const checks = [
    { pass: !!mcp.repository, label: "public source repo" },
    { pass: !!(mcp.repoMeta?.license || mcp.license), label: "declared license" },
    { pass: !!mcp.readme, label: "documentation" },
    { pass: !!mcp.tools?.length, label: "discoverable tool list" },
  ];
  const passed = checks.filter((c) => c.pass);

  return {
    id: "transparency",
    label: "Transparency",
    weight: 20,
    value: passed.length / checks.length,
    detail: `${passed.length}/${checks.length}: ${checks
      .map((c) => `${c.pass ? "✓" : "✗"} ${c.label}`)
      .join(", ")}.`,
  };
}

function provenance(mcp: Mcp): Component {
  if (mcp.source === "Official reference") {
    return {
      id: "provenance",
      label: "Provenance",
      weight: 15,
      value: 1,
      detail: "Official reference implementation, maintained by the MCP steering group.",
    };
  }

  const mismatch = mcp.packages.some((p) => p.repoMatchesRegistry === false);
  if (mismatch) {
    return {
      id: "provenance",
      label: "Provenance",
      weight: 15,
      value: 0,
      detail: "The package's declared repository does not match the registry entry.",
    };
  }

  const verifiedLink = mcp.packages.some((p) => p.repoMatchesRegistry === true);
  const isFork = mcp.repoMeta?.isFork;

  if (!mcp.repository) {
    return {
      id: "provenance",
      label: "Provenance",
      weight: 15,
      value: 0,
      detail: "No source repository to trace the code back to.",
    };
  }

  if (isFork) {
    return { id: "provenance", label: "Provenance", weight: 15, value: 0.5, detail: "Repository is a fork." };
  }

  return {
    id: "provenance",
    label: "Provenance",
    weight: 15,
    value: verifiedLink ? 1 : 0.75,
    detail: verifiedLink
      ? "Package and registry entry point at the same repository."
      : "Links to its own repository; package linkage unverified.",
  };
}

function hygiene(mcp: Mcp): Component {
  const launch = launchFor(mcp);

  if (launch.mode === "unknown") {
    return {
      id: "hygiene",
      label: "Packaging",
      weight: 15,
      value: 0,
      detail: "Publishes neither a package nor an endpoint — nothing installable.",
    };
  }

  if (launch.mode === "remote") {
    const headers = mcp.remotes[0]?.headers ?? [];
    const documented = headers.length > 0;
    return {
      id: "hygiene",
      label: "Packaging",
      weight: 15,
      value: documented ? 1 : 0.75,
      detail: documented
        ? "Remote endpoint with documented authentication."
        : "Remote endpoint; authentication requirements not declared.",
    };
  }

  const deprecated = mcp.packages.some((p) => p.deprecated);
  if (deprecated) {
    return { id: "hygiene", label: "Packaging", weight: 15, value: 0, detail: "Package is deprecated." };
  }

  // "latest" means the code can change under you between runs.
  const pinned = mcp.packages.some((p) => p.version && p.version !== "latest");
  return {
    id: "hygiene",
    label: "Packaging",
    weight: 15,
    value: pinned ? 1 : 0.5,
    detail: pinned
      ? `Publishes a pinned version (${mcp.packages[0]?.version}).`
      : "No pinned version — installs resolve to whatever is latest at launch.",
  };
}

/** Minimum share of weight that must be measurable for a score to be shown. */
const MIN_COVERAGE = 0.5;

export function healthOf(mcp: Mcp): Health {
  const components = [maintenance(mcp), adoption(mcp), transparency(mcp), provenance(mcp), hygiene(mcp)];

  const measured = components.filter((c) => c.value !== null);
  const totalWeight = components.reduce((a, c) => a + c.weight, 0);
  const measuredWeight = measured.reduce((a, c) => a + c.weight, 0);
  const coverage = measuredWeight / totalWeight;

  if (coverage < MIN_COVERAGE) {
    return { score: null, grade: null, coverage, components };
  }

  // Normalized over measured weight only, so unmeasurable components neither
  // help nor hurt.
  const earned = measured.reduce((a, c) => a + (c.value ?? 0) * c.weight, 0);
  const score = Math.round((earned / measuredWeight) * 100);

  return {
    score,
    grade: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D",
    coverage,
    components,
  };
}

/** Credentials the server needs, gathered from packages and remote endpoints. */
export function requirementsOf(mcp: Mcp) {
  const env = mcp.packages.flatMap((p) => p.env ?? []);
  const headers = mcp.remotes.flatMap((r) => r.headers ?? []);
  const all = [...env, ...headers];

  return {
    env,
    headers,
    required: all.filter((i) => i.required),
    secrets: all.filter((i) => i.secret),
    /** null = the registry declares nothing either way, which is not the same as "none". */
    authType: authTypeOf(mcp),
  };
}

function authTypeOf(mcp: Mcp): { label: string; detail: string } | null {
  const headers = mcp.remotes.flatMap((r) => r.headers ?? []);
  const env = mcp.packages.flatMap((p) => p.env ?? []);

  const authHeader = headers.find((h) => /^authorization$/i.test(h.name));
  if (authHeader) {
    const mentionsOauth = /oauth/i.test(authHeader.description ?? "");
    return {
      label: mentionsOauth ? "OAuth or bearer token" : "Bearer token",
      detail: authHeader.description ?? "Sent as an Authorization header.",
    };
  }

  const key = env.find((e) => e.secret) ?? headers.find((h) => h.secret);
  if (key) {
    return { label: "API key", detail: key.description ?? `Supplied via ${key.name}.` };
  }

  if (headers.length || env.length) {
    return { label: "Configuration only", detail: "Declares config values but no credentials." };
  }

  return null;
}
