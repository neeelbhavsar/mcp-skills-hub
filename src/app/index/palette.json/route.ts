import { paletteWithTools } from "@/lib/data";

// Statically generated at build time — a file, not a running service.
export const dynamic = "force-static";

/**
 * The ⌘K search index, fetched by the palette the first time it opens.
 *
 * This used to be a prop of the site-wide <Nav>, which serialized every
 * resource and every tool into the HTML of every page — ~95% of each document,
 * the 404 page included. The client requests it with `?v=<data stamp>`, so a
 * new daily build is a new cache key and the long max-age is safe.
 */
export function GET() {
  return Response.json(paletteWithTools, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
