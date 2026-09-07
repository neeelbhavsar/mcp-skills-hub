import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { USE_CASES, getUseCase, resolveUseCase } from "@/lib/use-cases";
import { mcpToCard, skillToCard } from "@/lib/view";
import { ResourceCard } from "@/components/catalog/resource-card";
import { PageHeader } from "@/components/layout/page-header";
import { absoluteUrl, breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) return {};
  const path = `/use-cases/${slug}`;
  return {
    title: useCase.title,
    description: useCase.intro,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: `${useCase.title} — AI Library`,
      description: useCase.intro,
      images: [OG_IMAGE],
    },
  };
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) notFound();

  const { mcps: servers, skills: matchedSkills } = resolveUseCase(useCase);

  // A FAQ node so the "how do I…" phrasing can surface directly in search.
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Use Cases", path: "/use-cases" },
      { name: useCase.title, path: `/use-cases/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: useCase.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${useCase.intro} ${servers.length} MCP servers on AI Library cover this. See ${absoluteUrl(`/use-cases/${slug}`)}.`,
          },
        },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader eyebrow="Use case" title={useCase.title} highlight="" subtitle={useCase.intro} />

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-warn" />
            Before you pick one
          </h2>
          <ul className="mt-3 space-y-2">
            {useCase.guidance.map((g) => (
              <li key={g} className="flex gap-2.5 text-sm text-muted">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {useCase.coverageNote && (
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <p className="rounded-2xl border border-warn/40 bg-warn/5 px-5 py-4 text-sm leading-relaxed text-muted">
            <span className="font-medium text-foreground">Coverage note:</span> {useCase.coverageNote}
          </p>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="mb-4 text-base font-semibold">
          MCP servers <span className="text-muted-2">({servers.length})</span>
        </h2>
        {servers.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing in the catalog matches this yet. <Link href="/mcps" className="text-brand hover:underline">Browse everything</Link>.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servers.map((m) => (
              <ResourceCard key={m.id} item={mcpToCard(m)} />
            ))}
          </div>
        )}
      </section>

      {matchedSkills.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <h2 className="mb-4 text-base font-semibold">
            Related skills <span className="text-muted-2">({matchedSkills.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matchedSkills.map((s) => (
              <ResourceCard key={s.id} item={skillToCard(s)} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
