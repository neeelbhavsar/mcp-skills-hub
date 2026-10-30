# Contributing to MCP Skills Hub

Thanks for helping. Most contributions don't need any code — the most useful thing you can do is tell us when something on the site is wrong.

## Report something (no code needed)

| What | How |
|---|---|
| A generated config **doesn't work** in your client | [Report a wrong config](https://github.com/neeelbhavsar/mcp-skills-hub/issues/new?template=wrong-config.yml) |
| A server or skill is **missing** | [Suggest a resource](https://github.com/neeelbhavsar/mcp-skills-hub/issues/new?template=add-resource.yml) |
| A **health score** or trust signal looks wrong | [Challenge the score](https://github.com/neeelbhavsar/mcp-skills-hub/issues/new?template=health-score.yml) |
| Anything else on the site is broken | [Report a bug](https://github.com/neeelbhavsar/mcp-skills-hub/issues/new?template=bug.yml) |

Wrong configs matter most: the whole point of the site is setup that works the first time.

> The catalog is generated from public registries every morning. A server missing from the
> site is usually best fixed by publishing it to the [MCP Registry](https://registry.modelcontextprotocol.io) —
> it then appears here automatically.

## Contribute code

```bash
git clone https://github.com/neeelbhavsar/mcp-skills-hub.git
cd mcp-skills-hub
npm install
npm run dev     # http://localhost:3000
```

The catalog data is committed in `src/data/`, so you don't need to run the pipeline to work on the site. Before opening a pull request:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

### Good first contributions

- **Add a use case** — append an entry to `USE_CASES` in [`src/lib/use-cases.ts`](src/lib/use-cases.ts). The page, sitemap entry and structured data are generated for you.
- **Improve a client guide** — the setup steps and troubleshooting for each client live in [`src/lib/clients.ts`](src/lib/clients.ts).
- **Add an AI client** — add it to `AI_TARGETS` in [`src/lib/ai-targets.ts`](src/lib/ai-targets.ts) and a `case` for it in `mcpUsage`, `skillUsage` and `repoUsage`. If it can only launch local processes, add its id to `STDIO_ONLY` in [`src/lib/compat.ts`](src/lib/compat.ts) and remote servers are bridged automatically.
- **Curate a collection** — collections are in [`src/lib/stacks.ts`](src/lib/stacks.ts).
- **Fix a config for one client** — per-client config shapes are in `bodyFor` in [`src/lib/ai-targets.ts`](src/lib/ai-targets.ts).

### Working on the data pipeline

```bash
GITHUB_TOKEN=ghp_… npm run data
```

The token is optional but without it stars and maintenance signals are skipped. `MCP_PROBE=0`, `SKIP_READMES=1` and `SKIP_INSPECT=1` make local runs much faster. Please don't commit data from a local run — the daily GitHub Action regenerates it with a token.

## Pull requests

- Keep each pull request to one change, and explain *why* in the description.
- Match the surrounding code: comments explain why something is the way it is, not what it does.
- UI changes: include a screenshot, and check both light and dark themes and a phone-width viewport.

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE), and to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
