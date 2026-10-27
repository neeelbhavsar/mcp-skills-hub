import type { Metadata } from "next";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { listingMetadata } from "@/lib/listings";

export const metadata: Metadata = listingMetadata("skills", null, 1);

export default function Page() {
  return <CatalogListing kind="skills" />;
}
