import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { listingMetadata, pageParams, parsePage } from "@/lib/listings";

// Crawlable pages of the catalog: the grid's "Load more" is a link here, so
// every entry is reachable without JavaScript.
export const dynamicParams = false;

export function generateStaticParams() {
  return pageParams("mcps", null);
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const page = parsePage((await params).n, "mcps", null);
  return page ? listingMetadata("mcps", null, page) : {};
}

export default async function Page({ params }: { params: Promise<{ n: string }> }) {
  const page = parsePage((await params).n, "mcps", null);
  if (!page) notFound();
  return <CatalogListing kind="mcps" page={page} />;
}
