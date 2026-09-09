import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { STACKS, getStack, resolveStack } from "@/lib/stacks";
import { mcpToCard } from "@/lib/view";
import { mergedConfig, serverEntry } from "@/lib/ai-targets";
import { ResourceCard } from "@/components/catalog/resource-card";
import { CodeBlock } from "@/components/fx/code-block";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return STACKS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stack = getStack(slug);
  if (!stack) return {};
  const path = `/stacks/${slug}`;
  return {
    title: `${stack.name} MCP stack`,
    description: `${stack.tagline} ${stack.rationale}`,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: `${stack.name} MCP stack — AI Library`,
      description: stack.rationale,
      images: [OG_IMAGE],
    },
  };
}

export default async function StackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stack = getStack(slug);
  if (!stack) notFound();

  const servers = resolveStack(stack);
  const config = mergedConfig(servers.map(serverEntry), "claude-code");
  const setupHref = `/setup?servers=${servers.map((m) => m.slug).join(",")}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Starter packs", path: "/stacks" },
              { name: stack.name, path: `/stacks/${slug}` },
            ]),
          ),
        }}
      />
      <PageHeader eyebrow="Starter pack" title={stack.name} highlight="" subtitle={stack.rationale} />

      <section className="mx-auto max-w-3xl px-4 pb-2 sm:px-6">
        <Link
          href={setupHref}
          className="ring-focus group inline-flex items-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Layers className="h-4 w-4" />
          Load into setup builder
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <p className="mt-3 text-xs text-muted-2">
          Or paste this straight into your terminal (Claude Code):
        </p>
        <CodeBlock code={config.code} language={config.language} className="mt-2" />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="mb-4 text-base font-semibold">What&apos;s in it</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((m) => (
            <ResourceCard key={m.id} item={mcpToCard(m)} />
          ))}
        </div>
      </section>
    </>
  );
}
