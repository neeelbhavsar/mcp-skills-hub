import { meta, mcps, skills, repos } from "@/lib/data";
import { AI_TARGETS } from "@/lib/ai-targets";
import { isInstallable } from "@/lib/compat";
import { healthOf } from "@/lib/health";
import { skillTitle } from "@/lib/view";
import { SITE_FORMER_NAME, SITE_NAME, SITE_URL, categoryPath, resourcePath } from "@/lib/seo";
import { clip } from "@/lib/utils";

export const dynamic = "force-static";

/**
 * llms.txt — a plain-text map of the site for agents and crawlers that would
 * otherwise have to parse the HTML. Points at the JSON API rather than
 * duplicating the whole catalog inline.
 *
 * The "Notable" lists are real rankings now (health score for servers, stars
 * for the rest). They used to be the first 15 in array order, which after the
 * official servers was simply alphabetical.
 */
export function GET() {
  const cats = (record: Record<string, number>, kind: "skills" | "mcps" | "repos") =>
    Object.entries(record)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `- [${name}](${SITE_URL}${categoryPath(kind, name)}) — ${count} entries`)
      .join("\n");

  const line = (name: string, slug: string, kind: "skills" | "mcps" | "repos", description: string, note = "") =>
    `- [${name}](${SITE_URL}${resourcePath(kind, slug)}): ${clip(description, 160)}${note}`;

  const topMcps = mcps
    .filter((m) => isInstallable(m) && healthOf(m).score !== null)
    .sort((a, b) => (healthOf(b).score ?? 0) - (healthOf(a).score ?? 0) || (b.stars ?? -1) - (a.stars ?? -1))
    .filter((m, i, all) => all.findIndex((x) => x.name === m.name) === i)
    .slice(0, 15)
    .map((m) => {
      const h = healthOf(m);
      return line(m.name, m.slug, "mcps", m.description, ` (health ${h.grade}, ${h.score}/100)`);
    })
    .join("\n");

  const topSkills = [...skills]
    .sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1))
    .slice(0, 15)
    .map((s) => line(skillTitle(s.name), s.slug, "skills", s.description))
    .join("\n");

  const topRepos = [...repos]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 15)
    .map((r) => line(r.fullName, r.slug, "repos", r.description, ` (${r.stars.toLocaleString("en-US")} stars)`))
    .join("\n");

  const body = `# ${SITE_NAME}

> ${SITE_NAME} (formerly ${SITE_FORMER_NAME}) is a directory of Model Context Protocol (MCP)
> servers, Agent Skills and GitHub repositories for AI coding assistants, with
> ready-to-paste setup for Claude Code, Claude Desktop, Cursor, Codex, Windsurf,
> Cline and VS Code. Data refreshed daily. Last update: ${meta.updatedAt}.

Counts: ${meta.counts.mcps} MCP servers, ${meta.counts.skills} skills, ${meta.counts.repos} repos.

## Machine-readable data

- [All MCP servers (JSON)](${SITE_URL}/api/mcps): launch config, generated config key, health score, trust signals, credentials and discovered tools (with input schemas) for each server.
- [All skills (JSON)](${SITE_URL}/api/skills)
- [All repos (JSON)](${SITE_URL}/api/repos)
- [OpenAPI description](${SITE_URL}/openapi.json) and [API catalog](${SITE_URL}/.well-known/api-catalog) (RFC 9727).
- [Catalog changes (RSS)](${SITE_URL}/feed.xml): new servers, newly archived ones, star movers.

## Search this directory from your assistant

An MCP server with tools search_mcp_servers, search_skills, search_tools and
get_install_config: \`claude mcp add mcp-skills-hub -- npx -y mcp-skills-hub\`.
Details: ${SITE_URL}/developers

## Guides

- [Best MCP servers](${SITE_URL}/best-mcp-servers): the top servers ranked by health score.
${AI_TARGETS.map((t) => `- [How to add an MCP server to ${t.name}](${SITE_URL}/clients/${t.id})`).join("\n")}
- [Use cases](${SITE_URL}/use-cases): task-oriented guides ("query a database", "browse the web").
- [Health score methodology](${SITE_URL}/health-score): the exact formula and weights.

## Tools

- [Setup builder](${SITE_URL}/setup): select multiple servers, get one merged config per client.
- [Tool search](${SITE_URL}/tools): find a server by the tool it exposes, e.g. "create_issue".
- [Collections](${SITE_URL}/stacks): curated multi-server stacks for common jobs.
- [What's new](${SITE_URL}/whats-new): daily diff of the catalog.
- [Compare](${SITE_URL}/compare): diff servers side by side — pass slugs as /compare?servers=<slug>,<slug>.

## MCP server categories

${cats(meta.categories.mcps, "mcps")}

## Skill categories

${cats(meta.categories.skills, "skills")}

## Top MCP servers by health score

${topMcps}

## Most-starred skills

${topSkills}

## Most-starred repos

${topRepos}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
