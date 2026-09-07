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

export interface McpPackage {
  registryType: string | null;
  identifier: string;
  version: string;
  transport: string;
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
  remotes: { type: string; url: string }[];
  tools?: string[];
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
