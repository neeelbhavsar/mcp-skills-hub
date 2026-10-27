import { meta } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";
import { SITEMAP_IDS } from "../sitemaps/sitemap";

export const dynamic = "force-static";

/**
 * The sitemap index, at the URL robots.txt and Search Console already know.
 * `generateSitemaps` writes the per-section files but no index, so this
 * lists them.
 */
export function GET() {
  const lastmod = new Date(meta.updatedAt).toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_IDS.map((id) => `  <sitemap><loc>${SITE_URL}/sitemaps/sitemap/${id}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
