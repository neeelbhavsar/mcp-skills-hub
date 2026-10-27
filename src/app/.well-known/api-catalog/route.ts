import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * RFC 9727 API catalog: how an agent discovers that the directory has a JSON
 * API without scraping HTML. Advertised from every page via
 * <link rel="api-catalog">.
 */
export function GET() {
  const doc = (path: string) => ({
    anchor: `${SITE_URL}${path}`,
    "service-desc": [{ href: `${SITE_URL}/openapi.json`, type: "application/openapi+json" }],
    "service-doc": [{ href: `${SITE_URL}/developers`, type: "text/html" }],
  });
  return new Response(
    JSON.stringify({ linkset: [doc("/api/mcps"), doc("/api/skills"), doc("/api/repos")] }, null, 2),
    {
      headers: {
        "Content-Type": "application/linkset+json",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
