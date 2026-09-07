import { mcps, meta } from "@/lib/data";
import { SITE_NAME, SITE_URL, resourcePath } from "@/lib/seo";

export const dynamic = "force-static";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * RSS of the most recently published MCP servers. Every registry entry carries
 * a publish timestamp, so "what's new" is free — and it is the main reason
 * someone would come back to a directory more than once.
 */
export function GET() {
  const recent = [...mcps]
    .filter((m) => m.updatedAt)
    .sort((a, b) => Date.parse(b.updatedAt!) - Date.parse(a.updatedAt!))
    .slice(0, 50);

  const items = recent
    .map((m) => {
      const url = `${SITE_URL}${resourcePath("mcps", m.slug)}`;
      return `    <item>
      <title>${escape(m.name)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(m.updatedAt!).toUTCString()}</pubDate>
      <category>${escape(m.category)}</category>
      <description>${escape(m.description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} — New MCP servers</title>
    <link>${SITE_URL}/mcps</link>
    <description>Newly published Model Context Protocol servers, refreshed daily.</description>
    <language>en</language>
    <lastBuildDate>${new Date(meta.updatedAt).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
