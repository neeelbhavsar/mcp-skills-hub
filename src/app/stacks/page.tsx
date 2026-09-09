import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { STACKS, resolveStack } from "@/lib/stacks";
import { PageHeader } from "@/components/layout/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Curated MCP server packs for common jobs — backend development, research, agent building — each one config, one click.";

export const metadata: Metadata = {
  title: "Starter packs",
  description: DESCRIPTION,
  alternates: { canonical: "/stacks" },
  openGraph: { url: "/stacks", title: "Starter packs — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function StacksPage() {
  const stacks = STACKS.map((s) => ({ ...s, resolved: resolveStack(s) }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: "Starter packs", path: "/stacks" }])),
        }}
      />
      <PageHeader
        eyebrow="Curated"
        title="Start from a"
        highlight="pack"
        subtitle="A reviewed selection for a job, rather than 266 servers and a search box. Each pack loads straight into the setup builder as one config."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {stacks.map((s) => (
            <Link key={s.slug} href={`/stacks/${s.slug}`} className="ring-focus group block rounded-2xl">
              <SpotlightCard as="div" className="h-full w-full p-6">
                <Layers className="mb-3 h-5 w-5 text-brand" />
                <h2 className="text-lg font-semibold text-foreground">{s.name}</h2>
                <p className="mt-1 text-sm text-muted-2">{s.tagline}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{s.rationale}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand">
                  {s.resolved.length} server{s.resolved.length === 1 ? "" : "s"}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
