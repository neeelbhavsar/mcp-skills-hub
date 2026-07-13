# AI Library

**The all-in-one, auto-updating directory of AI Skills, MCP servers, and GitHub repos** for
Claude, Cursor, Codex, Windsurf, Cline, VS Code and every other AI coding assistant — with
copy-paste setup instructions generated for each one.

Built with Next.js 16 (App Router) · Tailwind v4 · Motion · a fully automated daily data pipeline.

---

## ✨ What it does

- **Three catalogs** — Skills, MCP Servers, and GitHub Repos — each with live search, category
  filters, sorting, and animated cards.
- **"How to use in your AI"** — open any resource and get step-by-step, copy-paste install/usage
  snippets tailored to Claude Code, Claude Desktop, Cursor, Codex CLI, Windsurf, Cline and VS Code.
- **Refreshed daily** — a GitHub Actions cron pulls new drops from the official registries and
  GitHub, commits the JSON, and the site redeploys automatically. No database, no server to babysit.

## 🏗️ Architecture

```
src/
  app/                 # routes: / (home), /skills, /mcps, /repos
  components/
    fx/                # aurora, scroll-reveal, code-block (copy)
    home/              # hero, stat counters, marquee, section previews
    catalog/           # catalog-shell, resource-card, detail-dialog, ai-usage
    layout/            # nav, footer, page-header
    ui/                # badge
  data/                # skills.json · mcps.json · repos.json · meta.json (generated)
  lib/                 # types, data loaders, view-models, ai-targets (usage engine)
scripts/               # the daily data pipeline (plain Node, no deps)
.github/workflows/     # refresh-data.yml (daily cron)
```

The UI reads static JSON committed into `src/data/`. Pages are statically pre-rendered; all
interactivity (search/filter/dialog) is client-side, so the whole site is CDN-cacheable.

## 🔄 The data pipeline

`npm run data` runs `scripts/build-data.mjs`, which fetches, normalizes, dedupes and writes
`src/data/*.json`. Sources (all public, machine-readable):

| Catalog | Sources |
|---|---|
| **MCP Servers** | [Official MCP Registry](https://registry.modelcontextprotocol.io) + [Glama](https://glama.ai) (merged & deduped) |
| **Skills** | [`anthropics/skills`](https://github.com/anthropics/skills) & `claude-plugins-official` `marketplace.json`, plus awesome-list READMEs |
| **Repos** | GitHub Search API (star-ranked, by topic: `mcp`, `ai-agents`, `llm`, `rag`, …) |

### Auto-update (GitHub Actions)

`.github/workflows/refresh-data.yml` runs every day at 06:00 UTC (and on-demand via *Run workflow*):

1. Checks out the repo and runs the pipeline.
2. Commits `src/data/*.json` only if something changed.
3. The push triggers a redeploy on your git-connected host (e.g. Vercel).

**Optional:** the workflow passes the built-in `GITHUB_TOKEN` to lift the GitHub Search API rate
limit. Nothing to configure for the registries — they're keyless.

## 🚀 Local development

```bash
npm install
npm run data      # generate/refresh src/data/*.json (optional — data is committed)
npm run dev       # http://localhost:3000
npm run build     # production build
```

## 🎨 Design

Dark-first "cinematic" theme: deep slate base, a violet→cyan brand gradient, emerald action accent,
glassmorphism surfaces, ambient aurora glow, and expo-out / spring motion. Fonts: Inter + JetBrains
Mono. Respects `prefers-reduced-motion` for CSS effects.

## 🧩 Adding another AI assistant

Usage snippets live in `src/lib/ai-targets.ts`. Add an entry to `AI_TARGETS` and a `case` in the
relevant generator (`mcpUsage`, `skillUsage`, `repoUsage`) — the tabs and detail dialog pick it up
automatically.

---

*Not affiliated with Anthropic, OpenAI, or Cursor. Resource data belongs to its respective owners.*
