import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { listingMetadata, pageParams, parsePage } from "@/lib/listings";

// Crawlable pages of the catalog: the grid's "Load more" is a link here, so
// every entry is reachable without JavaScript.
export const dynamicParams = false;

export function generateStaticParams() {
  return pageParams("repos", null);
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const page = parsePage((await params).n, "repos", null);
  return page ? listingMetadata("repos", null, page) : {};
}

export default async function Page({ params }: { params: Promise<{ n: string }> }) {
  const page = parsePage((await params).n, "repos", null);
  if (!page) notFound();
  return <CatalogListing kind="repos" page={page} />;
}
