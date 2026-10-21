// Hand-curated MCP servers.
//
// Why this exists: the official registry fetch is paged and capped, and a lot
// of registry entries omit `repository`, so the server arrives with no stars,
// no maintenance signal and no README. Entries listed here are published on the
// registry but were either past the page cap or too thin to be useful, so the
// missing fields are filled in by hand.
//
// These are merged ahead of the registry results in fetch-mcps.mjs, so a
// curated record wins the slug dedupe while the normal enrichment pass
// (repoMeta, README, tool probe) still runs over it.
//
// Keep this list short and only for servers that are genuinely on the official
// registry — `qualifiedName` must match the registry's reverse-DNS name so the
// generated install configs line up with what publishers document.

import { log } from "./lib/util.mjs";
import { slugify } from "./lib/util.mjs";

const CURATED = [
  {
    // Registry: io.github.worklittle/jobs — requested via issue #1.
    qualifiedName: "io.github.worklittle/jobs",
    name: "Worklittle Jobs",
    category: "Productivity",
    description:
      "Search over 4 million jobs with visa, salary and distance filters, swipe to apply from your AI app, and save roles to a Worklittle account.",
    repository: "https://github.com/worklittle/jobs-mcp",
    homepage: "https://docs.worklittle.com/mcp",
    license: null,
    remotes: [{ type: "streamable-http", url: "https://mcp.worklittle.com/", headers: [] }],
    packages: [],
  },
];

export async function fetchCuratedMCPs() {
  const out = CURATED.map((c) => ({
    id: `mcp:${slugify(c.qualifiedName)}`,
    name: c.name,
    qualifiedName: c.qualifiedName,
    slug: slugify(c.qualifiedName),
    description: c.description,
    category: c.category,
    repository: c.repository,
    homepage: c.homepage || c.repository,
    packages: c.packages || [],
    remotes: c.remotes || [],
    tools: [],
    license: c.license ?? null,
    stars: null,
    source: "MCP Registry",
    updatedAt: null,
  }));

  log(`curated servers: ${out.length}`);
  return out;
}
