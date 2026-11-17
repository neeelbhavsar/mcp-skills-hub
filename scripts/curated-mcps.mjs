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
// Keep this list short. For servers on the official registry, `qualifiedName`
// must match the registry's reverse-DNS name so the generated install configs
// line up with what publishers document. A publisher may also ask directly for
// a server that is not on the registry; those use the reverse-DNS of the
// publisher's own domain and set `source` so the card doesn't claim a registry
// listing that doesn't exist.

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
  {
    // Not on the registry — submitted by the xmcp team. The `xmcp` npm package
    // is the framework, not this server, so it must stay remote-only: an
    // `npx xmcp` config would launch the wrong thing.
    qualifiedName: "dev.xmcp/xmcp",
    name: "xmcp",
    category: "Docs & Knowledge",
    description:
      "Read-only search over the xmcp TypeScript framework's guides and API docs: query the documentation or fetch a page by its ID. No account or API key needed.",
    repository: "https://github.com/basementstudio/xmcp",
    homepage: "https://xmcp.dev",
    license: "MIT",
    remotes: [{ type: "streamable-http", url: "https://xmcp.dev/mcp", headers: [] }],
    packages: [],
    source: "Publisher submission",
  },
  {
    // Registry: com.xquik/mcp — published, but past the registry page cap.
    qualifiedName: "com.xquik/mcp",
    name: "Xquik",
    category: "Marketing & Social",
    description:
      "Search X (Twitter) posts, export followers and replies, look up profiles, analyze post sentiment and monitor accounts with signed webhooks. Paid, usage-based service; not affiliated with X Corp.",
    repository: "https://github.com/Xquik-dev/x-twitter-scraper",
    homepage: "https://xquik.com",
    license: null,
    remotes: [{ type: "streamable-http", url: "https://xquik.com/mcp", headers: [] }],
    packages: [],
  },
  {
    // Registry: dev.datacircle/datacircle — past the registry page cap.
    qualifiedName: "dev.datacircle/datacircle",
    name: "Datacircle",
    category: "Marketing & Social",
    description:
      "Compare go-to-market (GTM) data APIs: list the APIs Datacircle tracks and search their plans and providers, best match first. Open to anyone, no API key.",
    repository: null,
    homepage: "https://datacircle.dev",
    license: null,
    remotes: [{ type: "streamable-http", url: "https://api.datacircle.dev/mcp", headers: [] }],
    packages: [],
  },
  {
    // Registry: io.corpusiq/multi-source-mcp — past the registry page cap. The
    // linked repo holds only the published manifest; the server is closed source.
    qualifiedName: "io.corpusiq/multi-source-mcp",
    name: "CorpusIQ",
    category: "Finance & Data",
    description:
      "One read-only endpoint over 40+ business systems, including QuickBooks, Shopify, Stripe, GA4, Google Ads, HubSpot, Salesforce, Klaviyo, Notion and Slack, with a source citation on each figure. Accounts connect through OAuth.",
    repository: "https://github.com/CorpusIQ/mcp-manifest",
    homepage: "https://www.corpusiq.io/docs/",
    license: null,
    remotes: [{ type: "streamable-http", url: "https://mcp2.corpusiq.io/mcp", headers: [] }],
    packages: [],
  },
  {
    // Registry: cloud.dchub/mcp-server — past the registry page cap. The record
    // also lists the `dchub-mcp-server` npm package, but the publisher asked
    // for the hosted endpoint, and a package would take precedence in launchFor.
    qualifiedName: "cloud.dchub/mcp-server",
    name: "DC Hub",
    category: "Finance & Data",
    description:
      "Data for data-center site selection: the daily Data Center Power Index of grid-power availability across 300+ markets, plus grid, interconnection, energy, market and facility search. Each result carries its source and as-of date. Free to start.",
    repository: "https://github.com/azmartone67/dchub-mcp-server",
    homepage: "https://dchub.cloud",
    license: "MIT",
    remotes: [{ type: "streamable-http", url: "https://dchub.cloud/mcp", headers: [] }],
    packages: [],
  },
  {
    // Not on the registry — submitted by vostride. The server runs through the
    // project's own agent-qa CLI, matching the entry `agent-qa init` writes.
    qualifiedName: "com.vostride/agent-qa",
    name: "agent-qa",
    category: "Dev Tools & Git",
    description:
      "Natural-language QA for web, Android and iOS from your coding agent, with a memory of past runs that keeps checked facts and retires stale ones. Runs locally: needs Node.js 24+, agent-qa installed and initialised in the project, and model access.",
    repository: "https://github.com/vostride/agent-qa",
    homepage: "https://vostride.com",
    license: "FSL-1.1-ALv2",
    remotes: [],
    packages: [
      {
        registryType: "npm",
        identifier: "agent-qa",
        version: "0.3.9",
        transport: "stdio",
        args: ["--config", "agent-qa.config.yaml", "mcp"],
      },
    ],
    source: "Publisher submission",
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
    source: c.source || "MCP Registry",
    updatedAt: null,
  }));

  log(`curated servers: ${out.length}`);
  return out;
}
