import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { USE_CASES, resolveUseCase } from "@/lib/use-cases";
import { PageHeader } from "@/components/layout/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Task-oriented guides to MCP servers and skills — query a database, browse the web, connect GitHub, read files, and more.";

export const metadata: Metadata = {
  title: "Use Cases",
  description: DESCRIPTION,
  alternates: { canonical: "/use-cases" },
  openGraph: { url: "/use-cases", title: "Use Cases — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function UseCasesPage() {
  const cases = USE_CASES.map((u) => ({ ...u, matches: resolveUseCase(u) }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: "Use Cases", path: "/use-cases" }])),
        }}
      />
      <PageHeader
        eyebrow="Start from the task"
        title="What do you want your"
        highlight="AI to do?"
        subtitle="Categories describe how the data is shaped. These pages answer the question the way you would actually ask it."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Link key={c.slug} href={`/use-cases/${c.slug}`} className="ring-focus group block rounded-2xl">
              <SpotlightCard as="div" className="h-full w-full p-6">
                <h2 className="text-lg font-semibold text-foreground">{c.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{c.intro}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand">
                  {c.matches.mcps.length} server{c.matches.mcps.length === 1 ? "" : "s"}
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
