// The official reference MCP servers, from modelcontextprotocol/servers.
//
// Why this exists: the public MCP Registry snapshot contains zero Postgres,
// SQL, or filesystem servers — it is dominated by hosted vertical SaaS
// entries. The servers people actually reach for first (filesystem, git,
// fetch, memory) live in the reference repo and never got registry entries,
// which left the catalog missing the basics.
//
// The README lists these by name and directory but does not declare package
// names or runtimes machine-readably, so that mapping is curated here. It is a
// short, stable list maintained by the MCP steering group — the archived
// servers (Postgres, SQLite, Redis, Puppeteer, Slack…) are deliberately
// excluded, since shipping install configs for dead code would be worse than
// omitting them.

import { log } from "./lib/util.mjs";

const REPO = "modelcontextprotocol/servers";
const TREE = `https://github.com/${REPO}/tree/main/src`;

const REFERENCE = [
  {
    dir: "filesystem",
    name: "Filesystem",
    registryType: "npm",
    identifier: "@modelcontextprotocol/server-filesystem",
    category: "Dev Tools & Git",
    description:
      "Secure file operations with configurable access controls — read, write, search and move files in directories you explicitly allow.",
  },
  {
    dir: "git",
    name: "Git",
    registryType: "pypi",
    identifier: "mcp-server-git",
    category: "Dev Tools & Git",
    description:
      "Read, search and manipulate Git repositories: inspect history and diffs, stage changes and commit from the conversation.",
  },
  {
    dir: "fetch",
    name: "Fetch",
    registryType: "pypi",
    identifier: "mcp-server-fetch",
    category: "Web & Search",
    description:
      "Fetch web pages and convert them to markdown for efficient LLM consumption, with chunked reading for long documents.",
  },
  {
    dir: "memory",
    name: "Memory",
    registryType: "npm",
    identifier: "@modelcontextprotocol/server-memory",
    category: "AI & Memory",
    description:
      "Knowledge-graph based persistent memory, letting an assistant retain entities, relations and observations across sessions.",
  },
  {
    dir: "sequentialthinking",
    name: "Sequential Thinking",
    registryType: "npm",
    identifier: "@modelcontextprotocol/server-sequential-thinking",
    category: "AI & Memory",
    description:
      "Structured, revisable step-by-step reasoning — lets a model branch, backtrack and refine a plan as it works.",
  },
  {
    dir: "time",
    name: "Time",
    registryType: "pypi",
    identifier: "mcp-server-time",
    category: "Productivity",
    description: "Current time and timezone conversion, so the assistant stops guessing at dates.",
  },
  {
    dir: "everything",
    name: "Everything",
    registryType: "npm",
    identifier: "@modelcontextprotocol/server-everything",
    category: "Dev Tools & Git",
    description:
      "Reference and test server exercising every MCP feature — prompts, resources, tools and sampling. Useful for building your own.",
  },
];

export async function fetchReferenceMCPs() {
  const out = REFERENCE.map((r) => ({
    id: `mcp:reference-${r.dir}`,
    name: r.name,
    qualifiedName: `io.modelcontextprotocol/${r.dir}`,
    slug: `official-${r.dir}`,
    description: r.description,
    category: r.category,
    repository: `https://github.com/${REPO}`,
    homepage: `${TREE}/${r.dir}`,
    packages: [
      {
        registryType: r.registryType,
        identifier: r.identifier,
        version: "latest",
        transport: "stdio",
      },
    ],
    remotes: [],
    tools: [],
    license: "MIT",
    stars: null,
    source: "Official reference",
    updatedAt: null,
  }));

  log(`reference servers: ${out.length}`);
  return out;
}
