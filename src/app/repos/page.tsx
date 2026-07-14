import type { Metadata } from "next";
import { repos, meta, categoriesOf } from "@/lib/data";
import { repoToCard } from "@/lib/view";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, collectionJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Top GitHub repos for AI workflows — agents, RAG, LLM frameworks and tooling. Learn how to use each in your AI editor.";

export const metadata: Metadata = {
  title: "GitHub Repos",
  description: DESCRIPTION,
  alternates: { canonical: "/repos" },
  openGraph: { url: "/repos", title: "GitHub Repos — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function ReposPage() {
  const items = repos.map(repoToCard);
  const cats = categoriesOf(meta.categories.repos);
  const jsonLd = [
    breadcrumbJsonLd([{ name: "Repos", path: "/repos" }]),
    collectionJsonLd("repos", DESCRIPTION),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Curated GitHub"
        title="The best AI repos to"
        highlight="build with"
        subtitle="Hand-picked, star-ranked repositories for agents, RAG, LLM frameworks and coding assistants — with steps to clone and wire each one into your AI editor."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <CatalogShell items={items} categories={cats} />
      </section>
    </>
  );
}
