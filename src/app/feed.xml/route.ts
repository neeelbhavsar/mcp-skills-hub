import { mcps, meta, changes } from "@/lib/data";
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

  const entry = (
    title: string,
    url: string,
    guid: string,
    date: string,
    category: string,
    description: string,
  ) => `    <item>
      <title>${escape(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${escape(guid)}</guid>
      <pubDate>${date}</pubDate>
      <category>${escape(category)}</category>
      <description>${escape(description)}</description>
    </item>`;

  const buildDate = new Date(meta.updatedAt).toUTCString();
  const mcpChanges = changes.kinds.mcps;

  // Newly archived servers are as worth knowing about as new ones — arguably
  // more so, since you may already have one installed.
  const archived = (mcpChanges?.deprecated ?? []).map((c) =>
    entry(
      `Archived: ${c.name}`,
      `${SITE_URL}${resourcePath("mcps", c.slug)}`,
      `archived:${c.slug}:${meta.updatedAt}`,
      buildDate,
      "Archived",
      `${c.name} has been archived by its maintainer and will not receive fixes. ${c.description}`,
    ),
  );

  const movers = (mcpChanges?.movers ?? [])
    .filter((c) => (c.delta ?? 0) > 0)
    .slice(0, 10)
    .map((c) =>
      entry(
        `+${c.delta} stars: ${c.name}`,
        `${SITE_URL}${resourcePath("mcps", c.slug)}`,
        `mover:${c.slug}:${meta.updatedAt}`,
        buildDate,
        "Trending",
        `${c.name} gained ${c.delta} stars since the last refresh (now ${c.stars}). ${c.description}`,
      ),
    );

  const published = recent.map((m) =>
    entry(
      m.name,
      `${SITE_URL}${resourcePath("mcps", m.slug)}`,
      `${SITE_URL}${resourcePath("mcps", m.slug)}`,
      new Date(m.updatedAt!).toUTCString(),
      m.category,
      m.description,
    ),
  );

  const items = [...archived, ...movers, ...published].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} — MCP catalog changes</title>
    <link>${SITE_URL}/mcps</link>
    <description>New MCP servers, newly archived ones and star-velocity movers, diffed daily.</description>
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
