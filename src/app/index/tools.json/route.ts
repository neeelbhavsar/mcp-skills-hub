import { toolIndex } from "@/lib/data";

export const dynamic = "force-static";

/**
 * Every discovered tool, for the /tools search box. Fetched when someone
 * starts searching; it used to be a prop, so all of it was inlined into the
 * /tools page HTML (the slowest page on mobile in the audit).
 */
export function GET() {
  return Response.json(toolIndex, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
