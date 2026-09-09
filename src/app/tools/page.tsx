import type { Metadata } from "next";
import { toolIndex, toolPages, mcps, meta } from "@/lib/data";
import Link from "next/link";
import { ToolSearch } from "@/components/search/tool-search";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Search MCP servers by the tools they expose. Find which server has a create_issue, search_docs or run_query tool — with full input schemas.";

export const metadata: Metadata = {
  title: "Tool Search",
  description: DESCRIPTION,
  alternates: { canonical: "/tools" },
  openGraph: { url: "/tools", title: "Tool Search — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function ToolsPage() {
  const servers = new Set(toolIndex.map((t) => t.slug)).size;
  const probed = mcps.filter((m) => m.toolsStatus).length;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: "Tool Search", path: "/tools" }])),
        }}
      />
      <PageHeader
        eyebrow="Search by capability"
        title="Which server has the"
        highlight="tool I need?"
        subtitle={`${toolIndex.length} tools across ${servers} servers, read from the live servers themselves — with input schemas. Search by tool name or by what you want to do.`}
      />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ToolSearch tools={toolIndex} />
        {/*
          The search above is client-side, so crawlers see none of it. This
          static list gives every tool page an actual inbound link instead of
          leaving 658 pages orphaned in the sitemap.
        */}
        <nav className="mt-10" aria-label="All tools">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Browse all tools</h2>
          <ul className="flex flex-wrap gap-1.5">
            {toolPages.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tools/${t.slug}`}
                  className="ring-focus inline-block rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-brand/50 hover:text-foreground"
                >
                  {t.name}
                  {t.providers.length > 1 && (
                    <span className="ml-1 text-[10px] text-muted-2">×{t.providers.length}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 rounded-xl border border-border bg-surface/60 px-4 py-3 text-xs leading-relaxed text-muted-2">
          Coverage: we asked all {probed} remote servers for their tool lists and {servers} answered. The
          rest either require credentials first or run as local packages, which we do not execute. Tool data
          is refreshed with the daily pipeline — last run {new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        </p>
      </section>
    </>
  );
}
