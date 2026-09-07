<div align="center">

# AI Library

**The auto-updating directory of Agent Skills, MCP servers and AI repos —
with copy-paste setup for every assistant.**

[**Browse the library →**](https://mcp-skills-hub.netlify.app)

[![Live site](https://img.shields.io/badge/live-mcp--skills--hub.netlify.app-7c6bff?style=flat-square)](https://mcp-skills-hub.netlify.app)
[![Data refreshed daily](https://img.shields.io/badge/data-refreshed%20daily-34d399?style=flat-square)](.github/workflows/refresh-data.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000?style=flat-square)](https://nextjs.org)
[![RSS](https://img.shields.io/badge/RSS-new%20servers-fbbf24?style=flat-square)](https://mcp-skills-hub.netlify.app/feed.xml)

**266** MCP servers · **314** Agent Skills · **125** repos · refreshed every morning

</div>

---

Every MCP directory can show you a list. The problem starts *after* you pick something:
the config you copy is wrong for your client, you have no idea whether the server is
maintained, and installing five of them means hand-merging five JSON blocks.

This one is built around those three problems.

## What makes it different

### 🎯 Configs that actually work

**77% of servers in this catalog are remote-only**, and most directories hand you a stdio config
for them anyway — `claude mcp add name -- https://…` tells Claude Code to execute a URL as
a binary. Here, every snippet is generated from the server's real transport, per client:

|  | Remote server | Packaged server |
|---|---|---|
| **Claude Code** | `--transport http` | `-- npx -y <pkg>` |
| **VS Code** | `"type": "http"` | `"type": "stdio"` |
| **Windsurf** | `serverUrl` | `command` + `args` |
| **Cline** | `streamableHttp` | `command` + `args` |
| **Claude Desktop / Codex** | bridged via `mcp-remote` | native |

Claude Desktop and Codex only launch local processes, so remote servers are wrapped in
`mcp-remote` automatically — and the page tells you why.

### 🛡️ Trust signals before you install

An MCP server runs with your credentials, and a stdio one executes code on your machine.
Every detail page states, plainly:

- **What it can reach** — local execution with your permissions, or data sent to a named third-party host
- **Whether it's maintained** — last commit, archived, fork, license, stars
- **Whether anyone uses it** — npm weekly downloads, publish recency, deprecation
- **Whether it is what it claims** — package's declared repo vs. the registry's

These are *signals*, not a safety score. None of them proves a server is safe or malicious;
the page says what it knows and lets you decide.

### 🧰 Build one config for everything

Tick servers as you browse, then open **[/setup](https://mcp-skills-hub.netlify.app/setup)**
for a single merged config — JSON for editors, a shell script for Claude Code (its CLI takes
one server per invocation), with bridges inserted where your client needs them.

### 🤖 Readable by agents, not just browsers

An MCP server that finds MCP servers — ask your assistant *"find me an MCP server for
fetching web pages and install it"* and it searches this catalog, then hands back the config.

```bash
# not yet published to npm — run it from the repo for now
claude mcp add ai-library -- node /absolute/path/to/mcp-skills-hub/mcp-server/index.mjs
```

See [`mcp-server/`](mcp-server/). There's also a JSON API and an
[`llms.txt`](https://mcp-skills-hub.netlify.app/llms.txt):

| Endpoint | Contents |
|---|---|
| [`/api/mcps`](https://mcp-skills-hub.netlify.app/api/mcps) | Every server with launch config, config key and trust signals |
| [`/api/skills`](https://mcp-skills-hub.netlify.app/api/skills) | Every Agent Skill with source and author |
| [`/api/repos`](https://mcp-skills-hub.netlify.app/api/repos) | Star-ranked repos with topics and language |
| [`/feed.xml`](https://mcp-skills-hub.netlify.app/feed.xml) | The 50 most recently published servers |

## Everything else

- **⌘K search** across all 705 resources at once
- **One-click install** into VS Code and Cursor via their URL handlers
- **Client compatibility filter** — "runs natively in Windsurf"
- **[Use-case pages](https://mcp-skills-hub.netlify.app/use-cases)** — *"query a database"*, *"browse the web"* — with editorial guidance, and an honest note where the catalog's coverage is thin
- **Light and dark themes**, applied before first paint
- **Ranked search** with typo tolerance and out-of-order terms
- Every category is a real, indexable route with its own OG image

## Architecture

No database, no server. Static JSON is committed to `src/data/`, every page is pre-rendered,
and the whole site is CDN-cacheable.

```
src/
  app/
    (skills|mcps|repos)/           # catalog, /[slug], /category/[category], per-item OG images
    use-cases/[slug]/              # task-oriented guides
    setup/                         # multi-server config builder
    api/(mcps|skills|repos)/       # static JSON API
    llms.txt · feed.xml · sitemap.ts · robots.ts
  components/
    catalog/                       # shell, card, detail, trust panel, install buttons
    cart/                          # setup-builder selection state
    search/                        # ⌘K palette
    fx/ home/ layout/ ui/
  lib/
    ai-targets.ts                  # per-client config generation + deep links
    compat.ts                      # launch resolution + client support matrix
    trust.ts                       # maintenance & supply-chain signals
    search.ts                      # ranked matcher with fuzzy fallback
    use-cases.ts                   # curated task pages
mcp-server/                        # the directory, as an MCP server
scripts/                           # data pipeline (plain Node, zero deps)
```

## The data pipeline

`npm run data` fetches, normalizes, dedupes and writes `src/data/*.json`.

| Catalog | Sources |
|---|---|
| **MCP servers** | [Official MCP Registry](https://registry.modelcontextprotocol.io) + the reference servers from [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers) |
| **Skills** | [`anthropics/skills`](https://github.com/anthropics/skills), `claude-plugins-official`, and awesome-list READMEs |
| **Repos** | GitHub Search API, star-ranked by topic |

Two notes on sources. The registry publishes almost no filesystem, git or database servers —
those live in the reference repo and never got registry entries, so they're pulled in
separately (the archived ones are deliberately excluded rather than shipping install configs
for dead code). [Glama](https://glama.ai) now requires auth; set `GLAMA_API_KEY` to re-enable
it for tool listings, or leave it off — it's enrichment only.

The pipeline refuses to overwrite a non-empty data file with an empty fetch, and exits
non-zero instead, so an upstream breaking change fails loudly rather than silently shipping
an empty catalog.

### Daily refresh

`.github/workflows/refresh-data.yml` runs at 06:00 UTC (and on demand). It commits
`src/data/*.json` only when something changed; the push triggers a redeploy.

> **`GITHUB_TOKEN` is required for trust signals.** Star counts, maintenance data and the
> "Popular" sort all come from the GitHub GraphQL API, which needs a token. Without one the
> pipeline degrades gracefully — it skips those fields rather than hammering the
> unauthenticated rate limit — but the trust panels will be sparse. CI supplies the built-in
> token automatically.

## Local development

```bash
npm install
npm run dev            # http://localhost:3000
npm run data           # refresh src/data/*.json (optional — data is committed)
npm run build          # production build
npm run lint
```

To populate trust signals locally:

```bash
GITHUB_TOKEN=ghp_… npm run data
```

## Extending it

**Add an AI assistant** — add an entry to `AI_TARGETS` in `src/lib/ai-targets.ts` and a `case`
in `mcpUsage` / `skillUsage` / `repoUsage`. Tabs, the setup builder and the compatibility
matrix pick it up. If the client can't launch remote servers, add its id to `STDIO_ONLY` in
`src/lib/compat.ts` and it gets bridged automatically.

**Add a use case** — append to `USE_CASES` in `src/lib/use-cases.ts`. The route, sitemap entry
and FAQ JSON-LD are generated; matching is by keyword, so the page stays current as the
registry changes.

**Add a trust signal** — add it to `trustSignals` in `src/lib/trust.ts`. Keep signals factual
and distinguish "we know this is false" from "we couldn't check".

## Design

Violet→cyan brand gradient with an emerald action accent, glassmorphism surfaces and ambient
aurora. Dark is the native mode; the light palette re-tunes the brand hues rather than reusing
them, since violet on white fails contrast. Respects `prefers-color-scheme` until you choose,
and `prefers-reduced-motion` throughout. Inter + JetBrains Mono.

---

<div align="center">

*Not affiliated with Anthropic, OpenAI, or Cursor.
Resource data belongs to its respective owners.*

</div>
