import type { Metadata } from "next";
import { toolIndex, toolPages, mcps, meta } from "@/lib/data";
import Link from "next/link";
import { ToolSearch } from "@/components/search/tool-search";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, OG_IMAGE, ogTitle, jsonLdScript } from "@/lib/seo";
import { isIndexableTool } from "@/lib/tool-index";

const DESCRIPTION =
  "Search MCP servers by the tools they expose. Find which server has a create_issue, search_docs or run_query tool — with full input schemas.";

export const metadata: Metadata = {
  title: "Tool Search",
  description: DESCRIPTION,
  alternates: { canonical: "/tools" },
  openGraph: { url: "/tools", title: ogTitle("Tool Search"), description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function ToolsPage() {
  const servers = new Set(toolIndex.map((t) => t.slug)).size;
  const probed = mcps.filter((m) => m.toolsStatus).length;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd([{ name: "Tool Search", path: "/tools" }])),
        }}
      />
      <PageHeader
        eyebrow="Search by capability"
        title="Which server has the"
        highlight="tool I need?"
        subtitle={`${toolIndex.length} tools across ${servers} servers, read from the live servers themselves — with input schemas. Search by tool name or by what you want to do.`}
      />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ToolSearch
          initial={toolIndex.slice(0, 40)}
          total={toolIndex.length}
          indexUrl={`/index/tools.json?v=${encodeURIComponent(meta.updatedAt)}`}
        />
        {/*
          The search above is client-side, so crawlers see little of it. This
          static list gives the indexable tool pages (those exposed by more
          than one server) an inbound link; single-provider tools are reached
          from their server's page instead.
        */}
        <nav className="mt-10" aria-label="All tools">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Tools offered by several servers</h2>
          <ul className="flex flex-wrap gap-1.5">
            {toolPages.filter((t) => isIndexableTool(t.name, t.providers.length)).map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tools/${t.slug}`}
                  className="ring-focus inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-2.5 font-mono text-xs text-muted transition-colors hover:border-brand/50 hover:text-foreground"
                >
                  {t.name}
                  {t.providers.length > 1 && (
                    <span className="ml-1 text-xs text-muted">×{t.providers.length}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 rounded-xl border border-border bg-surface/60 px-4 py-3 text-xs leading-relaxed text-muted-2">
          Coverage: tools for {servers} servers, read from the live server where it answers without
          credentials ({probed} remote servers asked) and otherwise from the project&apos;s README. Packaged
          servers are never executed to find out. Tool data
          is refreshed with the daily pipeline — last run {new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        </p>
      </section>
    </>
  );
}
