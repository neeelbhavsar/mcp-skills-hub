import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, PackagePlus, PackageX, Rss, Archive, RotateCcw } from "lucide-react";
import { changes, meta } from "@/lib/data";
import type { ChangeEntry, KindChanges } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, resourcePath, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "New MCP servers, newly abandoned ones and star-velocity movers — diffed daily against the previous catalog snapshot.";

export const metadata: Metadata = {
  title: "What's new",
  description: DESCRIPTION,
  alternates: { canonical: "/whats-new" },
  openGraph: { url: "/whats-new", title: "What's new — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

function Section({
  title,
  icon,
  entries,
  kind,
  empty,
  showDelta,
}: {
  title: string;
  icon: React.ReactNode;
  entries: ChangeEntry[];
  kind: "skills" | "mcps" | "repos";
  empty: string;
  showDelta?: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon}
        {title} <span className="text-muted-2">({entries.length})</span>
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-2">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/60">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={resourcePath(kind, entry.slug)}
                className="ring-focus flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{entry.name}</span>
                  <span className="mt-0.5 block line-clamp-2 text-xs text-muted">{entry.description}</span>
                </span>
                {showDelta && typeof entry.delta === "number" && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-xs ${
                      entry.delta > 0 ? "text-accent" : "text-danger"
                    }`}
                  >
                    {entry.delta > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WhatsNewPage() {
  const mcpChanges: KindChanges | undefined = changes.kinds.mcps;
  const skillChanges: KindChanges | undefined = changes.kinds.skills;

  const noBaseline = !mcpChanges?.baseline;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: "What's new", path: "/whats-new" }])),
        }}
      />
      <PageHeader
        eyebrow="Changelog"
        title="What changed in the"
        highlight="catalog"
        subtitle="The pipeline rewrites the catalog every morning, so the previous snapshot is always one commit back. This is the diff."
      />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3">
          <p className="text-xs text-muted-2">
            Compared against the previous snapshot · data from{" "}
            {new Date(meta.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <a
            href="/feed.xml"
            className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
          >
            <Rss className="h-3.5 w-3.5" /> RSS
          </a>
        </div>

        {noBaseline ? (
          <p className="mt-6 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-muted">
            No previous snapshot to compare against yet — this page fills in after the next daily refresh.
          </p>
        ) : (
          <>
            <Section
              title="New MCP servers"
              icon={<PackagePlus className="h-4 w-4 text-accent" />}
              entries={mcpChanges?.added ?? []}
              kind="mcps"
              empty="No new servers since the last refresh."
            />
            <Section
              title="Newly archived"
              icon={<Archive className="h-4 w-4 text-danger" />}
              entries={mcpChanges?.deprecated ?? []}
              kind="mcps"
              empty="Nothing was archived since the last refresh."
            />
            <Section
              title="Star movers"
              icon={<ArrowUpRight className="h-4 w-4 text-brand-2" />}
              entries={mcpChanges?.movers ?? []}
              kind="mcps"
              empty="No significant star movement. Movers need at least 5 stars and 5% change, so small projects don't dominate."
              showDelta
            />
            <Section
              title="Back in maintenance"
              icon={<RotateCcw className="h-4 w-4 text-accent" />}
              entries={mcpChanges?.revived ?? []}
              kind="mcps"
              empty="No archived servers came back."
            />
            <Section
              title="Removed from the registry"
              icon={<PackageX className="h-4 w-4 text-muted-2" />}
              entries={mcpChanges?.removed ?? []}
              kind="mcps"
              empty="Nothing was withdrawn."
            />
            <Section
              title="New skills"
              icon={<PackagePlus className="h-4 w-4 text-accent" />}
              entries={skillChanges?.added ?? []}
              kind="skills"
              empty="No new skills since the last refresh."
            />
          </>
        )}
      </section>
    </>
  );
}
