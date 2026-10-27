import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star, Wrench } from "lucide-react";
import { mcps, meta } from "@/lib/data";
import { isInstallable, launchFor } from "@/lib/compat";
import { healthOf } from "@/lib/health";
import { requirementsOf } from "@/lib/health";
import type { Mcp } from "@/lib/types";
import { HealthPill } from "@/components/catalog/health-badge";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE, SITE_URL, absoluteUrl, breadcrumbJsonLd, jsonLdScript, ogTitle, resourcePath } from "@/lib/seo";
import { formatStars, timeAgo } from "@/lib/utils";

const SIZE = 25;
const PER_CATEGORY = 3;

const month = new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

const DESCRIPTION = `The ${SIZE} best MCP servers right now, ranked by a published health score (maintenance, adoption, transparency and packaging) — with what each one does and how to install it in Claude, Cursor or VS Code.`;

export const metadata: Metadata = {
  title: `Best MCP servers (${month}) — ranked by health score`,
  description: DESCRIPTION,
  alternates: { canonical: "/best-mcp-servers" },
  openGraph: { type: "article", url: "/best-mcp-servers", title: ogTitle(`The ${SIZE} best MCP servers`), description: DESCRIPTION, images: [OG_IMAGE] },
};

/** Installable, scored, one per display name (the registry repeats products under several namespaces). */
function ranked(pool: Mcp[]) {
  const seen = new Set<string>();
  return pool
    .filter((m) => isInstallable(m) && healthOf(m).score !== null)
    .sort((a, b) => (healthOf(b).score ?? 0) - (healthOf(a).score ?? 0) || (b.stars ?? -1) - (a.stars ?? -1))
    .filter((m) => {
      const key = m.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** One sentence of evidence for why a server is on the list. */
function why(m: Mcp) {
  const h = healthOf(m);
  const launch = launchFor(m);
  const req = requirementsOf(m);
  const parts = [
    `Health ${h.grade} (${h.score}/100)`,
    m.stars != null ? `${formatStars(m.stars)} GitHub stars` : null,
    m.repoMeta?.pushedAt ? `last commit ${timeAgo(m.repoMeta.pushedAt)}` : null,
    m.tools?.length ? `${m.tools.length} tools` : null,
    launch.mode === "stdio" ? "runs locally" : "hosted remotely",
    req.required.length || req.secrets.length ? "needs an API key" : "no API key",
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function BestMcpServersPage() {
  const top = ranked(mcps).slice(0, SIZE);
  const categories = [...new Set(mcps.map((m) => m.category))]
    .filter((c) => c !== "Other")
    .map((c) => ({ name: c, servers: ranked(mcps.filter((m) => m.category === c)).slice(0, PER_CATEGORY) }))
    .filter((c) => c.servers.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const jsonLd = [
    breadcrumbJsonLd([{ name: "Best MCP servers", path: "/best-mcp-servers" }]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${SITE_URL}/best-mcp-servers#list`,
      name: `The ${SIZE} best MCP servers`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: top.length,
      itemListElement: top.map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(resourcePath("mcps", m.slug)),
        name: m.name,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader
        eyebrow={`Updated ${month}`}
        title={`The ${SIZE} best`}
        highlight="MCP servers"
        subtitle="Ranked by health score rather than by hype: how actively each is maintained, how widely it is used, whether its source and tools are public, and how cleanly it is packaged. Recomputed every day from the live catalog."
      />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-base leading-relaxed text-muted">
          The best MCP server is the one that does your job and is still maintained. By that measure the top three
          today are{" "}
          {top.slice(0, 3).map((m, i) => (
            <span key={m.slug}>
              {i > 0 && (i === 2 ? " and " : ", ")}
              <Link href={resourcePath("mcps", m.slug)} className="text-brand hover:underline">
                {m.name}
              </Link>
            </span>
          ))}
          . Every score is broken down on the server&apos;s page, and the formula is published on{" "}
          <Link href="/health-score" className="text-brand hover:underline">
            how the health score works
          </Link>
          .
        </p>

        <ol className="mt-8 space-y-4">
          {top.map((m, i) => (
            <li key={m.slug} className="rounded-2xl border border-border bg-surface/60 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-brand-2">#{i + 1}</span>
                <h2 className="text-base font-semibold text-foreground">
                  <Link href={resourcePath("mcps", m.slug)} className="hover:text-brand">
                    {m.name}
                  </Link>
                </h2>
                <HealthPill health={healthOf(m)} />
                {m.stars != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Star className="h-3.5 w-3.5 text-warn" aria-hidden /> {formatStars(m.stars)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.description}</p>
              <p className="mt-2 text-xs text-muted">{why(m)}</p>
              <Link
                href={`${resourcePath("mcps", m.slug)}#install`}
                className="ring-focus mt-2 inline-flex min-h-11 items-center gap-1 text-xs text-brand hover:underline"
              >
                <Wrench className="h-3.5 w-3.5" aria-hidden /> Install {m.name}
              </Link>
            </li>
          ))}
        </ol>

        <section className="mt-12">
          <h2 className="text-lg font-semibold">Best MCP servers by category</h2>
          <div className="mt-4 space-y-6">
            {categories.map((c) => (
              <div key={c.name}>
                <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                <ul className="mt-2 space-y-1.5">
                  {c.servers.map((m) => (
                    <li key={m.slug} className="flex flex-wrap items-center gap-2 text-sm">
                      <Link href={resourcePath("mcps", m.slug)} className="text-brand hover:underline">
                        {m.name}
                      </Link>
                      <HealthPill health={healthOf(m)} />
                      <span className="text-xs text-muted">{why(m)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-sm">
          <Link href="/mcps" className="inline-flex items-center gap-1 text-brand hover:underline">
            Browse all {mcps.length.toLocaleString("en-US")} MCP servers <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      </article>
    </>
  );
}
