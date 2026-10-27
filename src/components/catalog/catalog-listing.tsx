import { meta } from "@/lib/data";
import type { ResourceKind } from "@/lib/types";
import { CATALOG_PAGE_SIZE, KIND_META, breadcrumbJsonLd, categoryPath, collectionJsonLd, jsonLdScript } from "@/lib/seo";
import { LISTING_COPY, categoriesFor, categoryCopy, listingItems, listingPath } from "@/lib/listings";
import { CatalogShell } from "./catalog-shell";
import { PageHeader } from "@/components/layout/page-header";

/**
 * A catalog listing: /mcps, /mcps/category/x, and the /page/[n] routes under
 * both. The shell receives only the items in scope, slimmed — a category page
 * used to ship the entire catalog, raw source objects included.
 */
export function CatalogListing({
  kind,
  category = null,
  page = 1,
}: {
  kind: ResourceKind;
  category?: string | null;
  page?: number;
}) {
  const copy = LISTING_COPY[kind];
  const kindMeta = KIND_META[kind];
  const items = listingItems(kind, category);
  const all = category ? listingItems(kind, null).length : items.length;
  const onPage = items.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  const cat = category ? categoryCopy(kind, category) : null;
  const path = listingPath(kind, category, page);

  const trail = [
    { name: kindMeta.label, path: kindMeta.path },
    ...(category ? [{ name: category, path: categoryPath(kind, category) }] : []),
    ...(page > 1 ? [{ name: `Page ${page}`, path }] : []),
  ];

  const jsonLd = [
    breadcrumbJsonLd(trail),
    collectionJsonLd(kind, cat?.description ?? copy.description, {
      path,
      name: cat?.title ?? copy.title,
      items: onPage,
      dateModified: meta.updatedAt,
    }),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader
        eyebrow={category ? kindMeta.label : copy.eyebrow}
        title={category ? category : copy.heading}
        highlight={category ? kindMeta.label : copy.highlight}
        subtitle={cat?.subtitle ?? copy.subtitle}
      >
        {/* Freshness, visible on phones too: the strongest proof the
            directory is maintained. */}
        <p className="text-xs text-muted">
          {items.length.toLocaleString("en-US")} {category ? "in this category" : "in the catalog"} · updated daily ·
          last refresh{" "}
          <time dateTime={meta.updatedAt}>
            {new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </time>
        </p>
      </PageHeader>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <CatalogShell
          kind={kind}
          pageItems={onPage}
          scopeCount={items.length}
          allUrl={`/index/cards/${kind}?v=${encodeURIComponent(meta.updatedAt)}`}
          categories={categoriesFor(kind)}
          activeCategory={category}
          totalCount={all}
          page={page}
        />
      </section>
    </>
  );
}
