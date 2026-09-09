import { meta, mcps, skills, repos } from "@/lib/data";
import { SITE_URL, categoryPath, resourcePath } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * llms.txt — a plain-text map of the site for agents and crawlers that would
 * otherwise have to parse the HTML. Points at the JSON API rather than
 * duplicating 700 entries inline.
 */
export function GET() {
  const cats = (record: Record<string, number>, kind: "skills" | "mcps" | "repos") =>
    Object.entries(record)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `- [${name}](${SITE_URL}${categoryPath(kind, name)}) — ${count} entries`)
      .join("\n");

  const top = (items: { name: string; slug: string; description: string }[], kind: "skills" | "mcps" | "repos") =>
    items
      .slice(0, 15)
      .map((i) => `- [${i.name}](${SITE_URL}${resourcePath(kind, i.slug)}): ${i.description}`)
      .join("\n");

  const body = `# AI Library

> A directory of Agent Skills, Model Context Protocol (MCP) servers and GitHub
> repositories for AI coding assistants, with ready-to-paste setup for Claude
> Code, Claude Desktop, Cursor, Codex, Windsurf, Cline and VS Code.
> Data refreshed daily. Last update: ${meta.updatedAt}.

Counts: ${meta.counts.skills} skills, ${meta.counts.mcps} MCP servers, ${meta.counts.repos} repos.

## Machine-readable data

- [All MCP servers (JSON)](${SITE_URL}/api/mcps): includes launch config, trust signals and the generated config key for each server.
- [All skills (JSON)](${SITE_URL}/api/skills)
- [All repos (JSON)](${SITE_URL}/api/repos)
- [All tools, per server (in /api/mcps)](${SITE_URL}/api/mcps): every server's discovered tool list with input schemas.
- [Catalog changes (RSS)](${SITE_URL}/feed.xml): new servers, newly archived ones, star movers.

## Tools

- [Setup builder](${SITE_URL}/setup): select multiple servers, get one merged config per client.
- [Use cases](${SITE_URL}/use-cases): task-oriented guides ("query a database", "browse the web").
- [Tool search](${SITE_URL}/tools): find a server by the tool it exposes, e.g. "create_issue".
- [Starter packs](${SITE_URL}/stacks): curated multi-server stacks for common jobs.
- [What's new](${SITE_URL}/whats-new): daily diff of the catalog.
- [Health score methodology](${SITE_URL}/health-score): the exact formula and weights.
- [Compare](${SITE_URL}/compare?servers=slug-a,slug-b): diff servers side by side.

## MCP server categories

${cats(meta.categories.mcps, "mcps")}

## Skill categories

${cats(meta.categories.skills, "skills")}

## Notable MCP servers

${top(mcps, "mcps")}

## Notable skills

${top(skills, "skills")}

## Notable repos

${top(repos, "repos")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
