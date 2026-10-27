import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { categoryFromSlug, categoriesFor, listingMetadata, pageParams, parsePage } from "@/lib/listings";
import { categorySlug } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return categoriesFor("repos").flatMap((c) =>
    pageParams("repos", c.name).map((p) => ({ category: categorySlug(c.name), ...p })),
  );
}

type Params = Promise<{ category: string; n: string }>;

function resolve({ category, n }: { category: string; n: string }) {
  const name = categoryFromSlug("repos", category);
  const page = name ? parsePage(n, "repos", name) : null;
  return name && page ? { name, page } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = resolve(await params);
  return r ? listingMetadata("repos", r.name, r.page) : {};
}

export default async function CategoryPageN({ params }: { params: Params }) {
  const r = resolve(await params);
  if (!r) notFound();
  return <CatalogListing kind="repos" category={r.name} page={r.page} />;
}
