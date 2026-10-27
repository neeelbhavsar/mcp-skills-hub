import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { categoryFromSlug, categoriesFor, listingMetadata } from "@/lib/listings";
import { categorySlug } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return categoriesFor("repos").map((c) => ({ category: categorySlug(c.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const name = categoryFromSlug("repos", (await params).category);
  // Self-referencing canonical: this is a page in its own right, not a
  // filtered view of the parent catalog.
  return name ? listingMetadata("repos", name, 1) : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const name = categoryFromSlug("repos", (await params).category);
  if (!name) notFound();
  return <CatalogListing kind="repos" category={name} />;
}
