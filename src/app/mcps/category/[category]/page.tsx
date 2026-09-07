import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mcps, meta, categoriesOf } from "@/lib/data";
import { mcpToCard } from "@/lib/view";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  breadcrumbJsonLd,
  categoryPath,
  categorySlug,
  collectionJsonLd,
  KIND_META,
} from "@/lib/seo";

export const dynamicParams = false;

const KIND = "mcps" as const;

/** Resolve a URL slug back to the human category name. */
function categoryFor(slug: string) {
  return Object.keys(meta.categories.mcps).find((name) => categorySlug(name) === slug) ?? null;
}

export function generateStaticParams() {
  return Object.keys(meta.categories.mcps).map((name) => ({ category: categorySlug(name) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const name = categoryFor(category);
  if (!name) return {};
  const count = meta.categories.mcps[name];
  const title = `${name} ${KIND_META[KIND].label}`;
  const description = `${count} ${name.toLowerCase()} ${KIND_META[KIND].label.toLowerCase()} for Claude, Cursor, Codex, Windsurf and VS Code — with copy-paste setup for each client.`;
  return {
    title,
    description,
    // Self-referencing canonical: this is a page in its own right, not a
    // filtered view of the parent catalog.
    alternates: { canonical: categoryPath(KIND, name) },
    openGraph: { url: categoryPath(KIND, name), title: `${title} — AI Library`, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const name = categoryFor(category);
  if (!name) notFound();

  const items = mcps.map(mcpToCard);
  const cats = categoriesOf(meta.categories.mcps);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: KIND_META[KIND].label, path: KIND_META[KIND].path },
      { name, path: categoryPath(KIND, name) },
    ]),
    collectionJsonLd(KIND, `${name} ${KIND_META[KIND].label} on AI Library.`),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow={KIND_META[KIND].label}
        title={`${name}`}
        highlight={KIND_META[KIND].label}
        subtitle={`Every ${KIND_META[KIND].singular.toLowerCase()} in ${name}, with ready-to-paste setup for your AI client.`}
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <CatalogShell kind={KIND} items={items} categories={cats} activeCategory={name} />
      </section>
    </>
  );
}
