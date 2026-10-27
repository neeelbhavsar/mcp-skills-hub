import { meta } from "@/lib/data";
import { REPO_URL, SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * A discovery document for agents probing /.well-known/ai-catalog.json.
 * There is no ratified standard for this file yet (it is a draft), so it is
 * kept to plain, self-describing links to what the site actually offers.
 */
export function GET() {
  const doc = {
    name: SITE_NAME,
    description:
      "Directory of MCP servers, Agent Skills and GitHub repos for AI assistants, with install configs for every client. Refreshed daily.",
    url: SITE_URL,
    updated: meta.updatedAt,
    resources: [
      { type: "llms-txt", url: `${SITE_URL}/llms.txt` },
      { type: "llms-full-txt", url: `${SITE_URL}/llms-full.txt` },
      { type: "api-catalog", url: `${SITE_URL}/.well-known/api-catalog` },
      { type: "openapi", url: `${SITE_URL}/openapi.json` },
      { type: "markdown", url: `${SITE_URL}/md/mcps/{slug}`, description: "Any detail page as Markdown" },
      { type: "rss", url: `${SITE_URL}/feed.xml` },
    ],
    mcp_servers: [
      {
        name: "mcp-skills-hub",
        description: "Search this directory from an assistant: search_mcp_servers, search_skills, search_tools, get_install_config.",
        transport: "stdio",
        install: "npx -y mcp-skills-hub",
        source: `${REPO_URL}/tree/main/mcp-server`,
      },
    ],
  };
  return Response.json(doc, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400", "Access-Control-Allow-Origin": "*" },
  });
}
