import { meta, mcps } from "@/lib/data";
import { healthOf } from "@/lib/health";
import { isInstallable } from "@/lib/compat";
import { mcpSummaryMarkdown } from "@/lib/markdown";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * llms-full.txt — every installable MCP server as a self-contained summary
 * with its Claude Code install command, best-maintained first. llms.txt stays
 * the short map; this is the one-file dump for agents that want the catalog
 * in context. Per-client steps for any server are at /md/mcps/<slug>.
 */
export function GET() {
  const entries = mcps
    .filter(isInstallable)
    .sort((a, b) => (healthOf(b).score ?? -1) - (healthOf(a).score ?? -1) || (b.stars ?? -1) - (a.stars ?? -1))
    .map((m) => mcpSummaryMarkdown(m, meta.updatedAt));

  const body = `# ${SITE_NAME} — full MCP server catalog

> ${entries.length} installable MCP servers, ranked by health score. Data as of ${meta.updatedAt}.
> Install steps for every client: ${SITE_URL}/md/mcps/<slug>. JSON: ${SITE_URL}/api/mcps.

${entries.join("\n\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
