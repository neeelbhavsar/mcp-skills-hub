<div align="center">

# AI Library

**Find the right MCP server or Agent Skill — and get setup that actually works
in your client.**

### [→ Open the library](https://mcp-skills-hub.vercel.app)

[![Live site](https://img.shields.io/badge/open-mcp--skills--hub.vercel.app-7c6bff?style=for-the-badge)](https://mcp-skills-hub.vercel.app)

[![Data refreshed daily](https://img.shields.io/badge/data-refreshed%20daily-34d399?style=flat-square)](https://mcp-skills-hub.vercel.app)
[![RSS](https://img.shields.io/badge/RSS-new%20servers-fbbf24?style=flat-square)](https://mcp-skills-hub.vercel.app/feed.xml)
[![JSON API](https://img.shields.io/badge/JSON-API-22d3ee?style=flat-square)](https://mcp-skills-hub.vercel.app/api/mcps)

**266** MCP servers · **314** Agent Skills · **125** repos · refreshed every morning

**Nothing to install.** It's a website — [just open it](https://mcp-skills-hub.vercel.app).

</div>

---

Every directory can show you a list. The problem starts *after* you pick something: the
config you copy is wrong for your client, you have no idea whether the server is maintained,
and installing five of them means hand-merging five JSON blocks.

This one is built around those three problems.

## 🎯 Configs that actually work

**77% of servers are remote-only**, and most directories hand you a stdio config for them
anyway — `claude mcp add name -- https://…` tells Claude Code to execute a URL as a binary.
Here every snippet is generated from the server's real transport, per client:

|  | Remote server | Packaged server |
|---|---|---|
| **Claude Code** | `--transport http` | `-- npx -y <pkg>` |
| **VS Code** | `"type": "http"` | `"type": "stdio"` |
| **Cursor** | `url` | `command` + `args` |
| **Windsurf** | `serverUrl` | `command` + `args` |
| **Cline** | `streamableHttp` | `command` + `args` |
| **Claude Desktop / Codex** | bridged via `mcp-remote` | native |

Claude Desktop and Codex only launch local processes, so remote servers get wrapped in
`mcp-remote` automatically — and the page tells you why.

**[One-click install](https://mcp-skills-hub.vercel.app/mcps)** into VS Code and Cursor,
straight from any server's page.

## 🛡️ Know what you're installing

An MCP server runs with your credentials, and a stdio one executes code on your machine.
Every server page states, plainly:

- **What it can reach** — local execution with your permissions, or data sent to a named third-party host
- **Whether it's maintained** — last commit, archived, fork, license, stars
- **Whether anyone uses it** — npm weekly downloads, publish recency, deprecation
- **Whether it is what it claims** — the package's declared repo vs. the registry's

These are *signals*, not a safety score. None proves a server is safe or malicious — the page
says what it knows and lets you decide.

## 🧰 Set up ten servers at once

Tick servers as you browse, then open **[the setup builder](https://mcp-skills-hub.vercel.app/setup)**
for one merged config — JSON for editors, a shell script for Claude Code, with bridges
inserted where your client needs them.

## 🤖 Use it from inside your assistant

An MCP server that finds MCP servers. Ask *"find me an MCP server for fetching web pages and
install it"* and your assistant searches the catalog, then hands back the config.

```bash
# not on npm yet — run it from a clone
claude mcp add ai-library -- node /absolute/path/to/mcp-skills-hub/mcp-server/index.mjs
```

Prefer to query it yourself? Everything is available as static JSON:

| Endpoint | Contents |
|---|---|
| [`/api/mcps`](https://mcp-skills-hub.vercel.app/api/mcps) | Every server with launch config, config key and trust signals |
| [`/api/skills`](https://mcp-skills-hub.vercel.app/api/skills) | Every Agent Skill with source and author |
| [`/api/repos`](https://mcp-skills-hub.vercel.app/api/repos) | Star-ranked repos with topics and language |
| [`/feed.xml`](https://mcp-skills-hub.vercel.app/feed.xml) | The 50 most recently published servers |
| [`/llms.txt`](https://mcp-skills-hub.vercel.app/llms.txt) | Plain-text site map for agents |

## Also on the site

- **⌘K search** across all 705 resources at once, with typo tolerance
- **[Use-case pages](https://mcp-skills-hub.vercel.app/use-cases)** — *"query a database"*,
  *"browse the web"* — with practical guidance, and an honest note where the catalog's
  coverage is thin
- **Client compatibility filter** — *runs natively in Windsurf*
- **Light and dark themes**, applied before first paint

## Where the data comes from

Refreshed every morning at 06:00 UTC, so the catalog never goes stale.

| Catalog | Sources |
|---|---|
| **MCP servers** | [Official MCP Registry](https://registry.modelcontextprotocol.io) + the reference servers from [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers) |
| **Skills** | [`anthropics/skills`](https://github.com/anthropics/skills), `claude-plugins-official`, and community awesome-lists |
| **Repos** | GitHub Search API, star-ranked by topic |

The registry publishes almost no filesystem, git or database servers — those live in the
reference repo and never got registry entries, so they're pulled in separately. The archived
ones (Postgres, SQLite, Redis, Puppeteer) are deliberately left out rather than shipping
install configs for dead code.

---

<details>
<summary><b>Running it yourself</b> — you don't need this to use the library</summary>

<br>

Next.js 16 (App Router) · Tailwind v4 · no database, no server. Static JSON is committed to
`src/data/`, every page is pre-rendered, the whole site is CDN-cacheable.

```bash
npm install
npm run dev            # http://localhost:3000
npm run data           # refresh src/data/*.json (optional — data is committed)
npm run build
npm run lint
```

**`GITHUB_TOKEN` is required for trust signals.** Star counts, maintenance data and the
"Popular" sort come from the GitHub GraphQL API. Without a token the pipeline degrades
gracefully — it skips those fields rather than hitting the unauthenticated rate limit — but
trust panels will be sparse. CI supplies one automatically.

```bash
GITHUB_TOKEN=ghp_… npm run data
```

The pipeline refuses to overwrite a non-empty data file with an empty fetch and exits
non-zero instead, so an upstream breaking change fails loudly rather than silently shipping
an empty catalog.

**Key modules**

| File | Role |
|---|---|
| `src/lib/ai-targets.ts` | Per-client config generation, deep links, merged configs |
| `src/lib/compat.ts` | Launch resolution + client support matrix |
| `src/lib/trust.ts` | Maintenance & supply-chain signals |
| `src/lib/use-cases.ts` | Curated task pages |
| `scripts/` | Data pipeline (plain Node, zero deps) |
| `mcp-server/` | The directory, as an MCP server |

**Adding an AI assistant** — add an entry to `AI_TARGETS` in `src/lib/ai-targets.ts` and a
`case` in `mcpUsage` / `skillUsage` / `repoUsage`. Tabs, the setup builder and the
compatibility matrix pick it up. If the client can't launch remote servers, add its id to
`STDIO_ONLY` in `src/lib/compat.ts` and it gets bridged automatically.

**Adding a use case** — append to `USE_CASES` in `src/lib/use-cases.ts`. The route, sitemap
entry and FAQ JSON-LD are generated.

</details>

---

<div align="center">

**[Open the library →](https://mcp-skills-hub.vercel.app)**

*Not affiliated with Anthropic, OpenAI, or Cursor.
Resource data belongs to its respective owners.*

</div>
