import type { Metadata } from "next";
import { mcps, meta, categoriesOf } from "@/lib/data";
import { mcpToCard } from "@/lib/view";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "MCP Servers — AI Library",
  description: "Browse Model Context Protocol servers. Copy-paste install configs for Claude, Cursor, Windsurf, VS Code, Codex and more.",
};

export default function McpsPage() {
  const items = mcps.map(mcpToCard);
  const cats = categoriesOf(meta.categories.mcps);
  return (
    <>
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
