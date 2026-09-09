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
