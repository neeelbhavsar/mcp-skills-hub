import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { USE_CASES, getUseCase, resolveUseCase } from "@/lib/use-cases";
import { mcpToCard, skillToCard } from "@/lib/view";
import { ResourceCard } from "@/components/catalog/resource-card";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE, absoluteUrl, breadcrumbJsonLd, jsonLdScript, ogTitle, resourcePath } from "@/lib/seo";

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
      title: ogTitle(useCase.title),
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
  const leaders = servers.slice(0, 3);

  // An ItemList of the matched servers. This was a one-question FAQPage,
  // which earns no rich result outside government and health sites.
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Use Cases", path: "/use-cases" },
      { name: useCase.title, path: `/use-cases/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: useCase.title,
      description: useCase.intro,
      url: absoluteUrl(`/use-cases/${slug}`),
      numberOfItems: servers.length,
      itemListElement: servers.map((m, i) => ({
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
      <PageHeader eyebrow="Use case" title={useCase.title} highlight="" subtitle={useCase.intro} />

      {/* The question as people ask it, with a direct answer that names
          servers. It used to say only "N MCP servers cover this". */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-foreground">{useCase.question}</h2>
          <p className="mt-2 text-base leading-relaxed text-muted">
            {leaders.length === 0 ? (
              "No server in the catalog covers this well yet."
            ) : (
              <>
                {leaders.map((m, i) => (
                  <span key={m.slug}>
                    {i > 0 && (i === leaders.length - 1 ? " and " : ", ")}
                    <Link href={resourcePath("mcps", m.slug)} className="text-brand hover:underline">
                      {m.name}
                    </Link>
                  </span>
                ))}{" "}
                {leaders.length === 1 ? "is" : "are"} the strongest matches in the catalog today, ranked by how
                directly they address this and how well they are maintained. {useCase.guidance[0]}
              </>
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-warn" aria-hidden />
            Before you pick one
          </h2>
          <ul className="mt-3 space-y-2">
            {useCase.guidance.map((g) => (
              <li key={g} className="flex gap-2.5 text-sm text-muted">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {useCase.coverageNote && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="rounded-2xl border border-warn/40 bg-warn/5 px-5 py-4 text-sm leading-relaxed text-muted">
            <span className="font-medium text-foreground">Coverage note:</span> {useCase.coverageNote}
          </p>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="mb-4 text-base font-semibold">
          MCP servers <span className="text-muted">({servers.length})</span>
        </h2>
        {servers.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing in the catalog matches this yet.{" "}
            <Link href="/mcps" className="text-brand hover:underline">
              Browse everything
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servers.map((m) => (
              <li key={m.id}>
                <ResourceCard item={mcpToCard(m)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {matchedSkills.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <h2 className="mb-4 text-base font-semibold">
            Related skills <span className="text-muted">({matchedSkills.length})</span>
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matchedSkills.map((s) => (
              <li key={s.id}>
                <ResourceCard item={skillToCard(s)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
