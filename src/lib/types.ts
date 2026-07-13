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
  tags: string[];
  stars: number | null;
}

export interface McpPackage {
  registryType: string | null;
  identifier: string;
  version: string;
  transport: string;
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
