export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  author: string;
  skills: string[];
  source: string;
  repo: string;
  sourceUrl: string;
  target: "claude" | "multi";
  stars: number | null;
  repoMeta?: RepoMeta | null;
}

/** A credential or config value the server needs, as the registry declares it. */
export interface InputSpec {
  name: string;
  description: string | null;
  required: boolean;
  secret: boolean;
  format: string | null;
}

/** One field of a tool's input schema. */
export interface ToolInput {
  name: string;
  type: string;
  description: string | null;
  required: boolean;
  enum?: string[];
}

/** A tool the server exposes, discovered by asking it directly. */
export interface McpTool {
  name: string;
  description: string | null;
  inputs: ToolInput[] | null;
}

/** One place in the published source where a capability was observed. */
export interface CapabilityEvidence {
  file: string;
  line: number;
  detail: string;
  /** Observed inside a bundled file, so it may come from a bundled dependency. */
  bundled?: boolean;
}

export type CapabilityId =
  | "exec"
  | "filesystem"
  | "network"
  | "dynamic-code"
  | "spawn"
  | "env"
  | "system";

export interface ObservedCapability {
  id: CapabilityId;
  evidence: CapabilityEvidence[];
}

/**
 * Static analysis of a published npm package, plus registry publisher signals.
 * Only the package's own files are read — never its dependencies, and nothing
 * is ever executed.
 */
export interface Inspection {
  name: string;
  version: string | null;
  /** ok = every file parsed · partial = some did not · unavailable/no-source */
  status: "ok" | "partial" | "unavailable" | "no-source";
  filesScanned?: number;
  filesTotal?: number;
  /** How many scanned files were bundles rather than hand-written source. */
  bundledFiles?: number;
  capabilities: ObservedCapability[];
  maintainers: number | null;
  publishedBy: string | null;
  /** npm trusted publishing: released by a verified CI identity, not a token. */
  trustedPublisher: string | null;
  /** SLSA provenance attestation linking artifact to source commit. */
  provenance: boolean;
  signed: boolean;
  /** Hooks that run automatically on install, before any deliberate use. */
  installScripts: string[] | null;
  unpackedSize: number | null;
  fileCount: number | null;
  analyzedAt: string;
}

export interface Readme {
  markdown: string;
  truncated: boolean;
  url: string;
}

export interface McpRemote {
  type: string;
  url: string;
  headers?: InputSpec[];
}

export interface McpPackage {
  registryType: string | null;
  identifier: string;
  version: string;
  transport: string;
  runtimeHint?: string | null;
  env?: InputSpec[];
  /** Supply-chain fields, populated for npm packages by the data pipeline. */
  weeklyDownloads?: number | null;
  lastPublished?: string | null;
  firstPublished?: string | null;
  deprecated?: boolean;
  declaredRepo?: string | null;
  /** Whether the package's own repo matches the one the registry advertises. */
  repoMatchesRegistry?: boolean | null;
}

/** GitHub metadata for the repo behind a resource. Null when it has none. */
export interface RepoMeta {
  slug: string;
  stars: number | null;
  forks: number | null;
  archived: boolean;
  isFork: boolean;
  createdAt: string | null;
  pushedAt: string | null;
  openIssues: number | null;
  license: string | null;
  language: string | null;
}

export interface Mcp {
  id: string;
  name: string;
  qualifiedName: string;
  slug: string;
  description: string;
  category: string;
  repository: string | null;
  homepage: string | null;
  packages: McpPackage[];
  remotes: McpRemote[];
  tools?: McpTool[];
  /** Outcome of live tool discovery: why the tool list may be absent. */
  toolsStatus?: "ok" | "auth" | "error" | "unsupported";
  readme?: Readme | null;
  inspection?: Inspection | null;
  license?: string | null;
  stars: number | null;
  source: string;
  updatedAt: string | null;
  repoMeta?: RepoMeta | null;
}

export interface Repo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  slug: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  license: string | null;
  category: string;
  updatedAt: string | null;
}

export interface Meta {
  updatedAt: string;
  counts: { skills: number; mcps: number; repos: number };
  categories: {
    skills: Record<string, number>;
    mcps: Record<string, number>;
    repos: Record<string, number>;
  };
  sources: { skills: string[]; mcps: string[]; repos: string[] };
}

export type ResourceKind = "skills" | "mcps" | "repos";

/** One entry in a change bucket — enough to render a row and link out. */
export interface ChangeEntry {
  slug: string;
  name: string;
  description: string;
  category: string;
  delta?: number;
  stars?: number;
}

export interface KindChanges {
  baseline: boolean;
  added: ChangeEntry[];
  removed: ChangeEntry[];
  deprecated: ChangeEntry[];
  revived: ChangeEntry[];
  movers: ChangeEntry[];
  counts?: {
    added: number;
    removed: number;
    deprecated: number;
    revived: number;
    previousTotal: number;
    currentTotal: number;
  };
}

/** Diff of today's catalog against the previous snapshot. */
export interface CatalogChanges {
  generatedAt: string;
  kinds: Partial<Record<"skills" | "mcps" | "repos", KindChanges>>;
}
