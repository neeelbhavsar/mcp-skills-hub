import type { Metadata } from "next";
import { mcps, meta, categoriesOf } from "@/lib/data";
import { mcpToCard } from "@/lib/view";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, collectionJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Browse Model Context Protocol servers. Copy-paste install configs for Claude, Cursor, Windsurf, VS Code, Codex and more.";

export const metadata: Metadata = {
  title: "MCP Servers",
  description: DESCRIPTION,
  alternates: { canonical: "/mcps" },
  openGraph: { url: "/mcps", title: "MCP Servers — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function McpsPage() {
  const items = mcps.map(mcpToCard);
  const cats = categoriesOf(meta.categories.mcps);
  const jsonLd = [
    breadcrumbJsonLd([{ name: "MCP Servers", path: "/mcps" }]),
    collectionJsonLd("mcps", DESCRIPTION),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Model Context Protocol"
        title="Connect your AI to anything with"
        highlight="MCP Servers"
        subtitle="MCP servers give your assistant real tools — databases, browsers, APIs, files. Every server here ships with ready-to-paste config for each AI client."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <CatalogShell items={items} categories={cats} />
      </section>
    </>
  );
}
