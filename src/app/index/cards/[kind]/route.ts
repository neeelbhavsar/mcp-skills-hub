import { listingItems } from "@/lib/listings";
import type { ResourceKind } from "@/lib/types";

export const dynamic = "force-static";
export const dynamicParams = false;

const KINDS: ResourceKind[] = ["mcps", "skills", "repos"];

export function generateStaticParams() {
  return KINDS.map((kind) => ({ kind }));
}

/**
 * Every slim card in one catalog, for search, filters and "Load more".
 * Listing pages now server-render only their own 24 cards and fetch this on
 * first interaction; shipping the whole catalog inline made /mcps ~500 KB.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return Response.json(listingItems(kind as ResourceKind, null), {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
