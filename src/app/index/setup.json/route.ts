import { setupIndex } from "@/lib/data";

export const dynamic = "force-static";

/**
 * Launch details for every server, for the setup builder.
 *
 * Previously passed to the site-wide CartProvider, so it was inlined into the
 * HTML of every page; now only /setup asks for it.
 */
export function GET() {
  return Response.json(setupIndex, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
