import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileCode, Wrench, XCircle } from "lucide-react";
import { AI_TARGETS, mcpUsage } from "@/lib/ai-targets";
import { CLIENT_GUIDES } from "@/lib/clients";
import { getMcp, mcps, meta } from "@/lib/data";
import { isNativeFor, isInstallable } from "@/lib/compat";
import { healthOf } from "@/lib/health";
import { mcpToCard } from "@/lib/view";
import { CodeBlock } from "@/components/fx/code-block";
import { ResourceCard } from "@/components/catalog/resource-card";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE, SITE_URL, absoluteUrl, breadcrumbJsonLd, jsonLdScript, ogTitle } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return AI_TARGETS.map((t) => ({ client: t.id }));
}

function resolve(id: string) {
  const target = AI_TARGETS.find((t) => t.id === id);
  const guide = CLIENT_GUIDES[id];
  return target && guide ? { target, guide } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ client: string }> }): Promise<Metadata> {
  const r = resolve((await params).client);
  if (!r) return {};
  const title = `How to add an MCP server to ${r.target.name}`;
  const description = `Where ${r.target.name} keeps its MCP config, the exact format it expects, a working example and fixes for common errors — plus the best servers that run natively in it.`;
  const path = `/clients/${r.target.id}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title: ogTitle(title), description, images: [OG_IMAGE] },
  };
}

const EXAMPLE_SLUG = "official-filesystem";

export default async function ClientGuidePage({ params }: { params: Promise<{ client: string }> }) {
  const r = resolve((await params).client);
  if (!r) notFound();
  const { target, guide } = r;

  const native = mcps.filter((m) => isInstallable(m) && isNativeFor(m, target.id));
  const top = [...native].sort((a, b) => (healthOf(b).score ?? -1) - (healthOf(a).score ?? -1)).slice(0, 9);
  const example = getMcp(EXAMPLE_SLUG);
  const exampleSteps = example ? mcpUsage(example, target.id).filter((s) => s.code) : [];
  const path = `/clients/${target.id}`;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Setup guides", path: "/clients" },
      { name: target.name, path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "@id": `${absoluteUrl(path)}#article`,
      headline: `How to add an MCP server to ${target.name}`,
      description: guide.intro,
      url: absoluteUrl(path),
      dateModified: meta.updatedAt,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      about: { "@type": "SoftwareApplication", name: target.name, applicationCategory: "DeveloperApplication" },
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader
        eyebrow="Setup guide"
        title={`How to add an MCP server to ${target.name}`}
        highlight=""
        subtitle={guide.intro}
      />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section aria-labelledby="where">
          <h2 id="where" className="flex items-center gap-2 text-lg font-semibold">
            <FileCode className="h-5 w-5 text-brand-2" aria-hidden /> Where the config lives
          </h2>
          <ul className="mt-3 space-y-2">
            {guide.configFiles.map((f) => (
              <li key={f.label} className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm">
                <span className="text-muted">{f.label}:</span> <code className="font-mono text-foreground">{f.path}</code>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            Servers go under the <code className="font-mono text-foreground">{guide.wrapperKey}</code> key
            {guide.format === "toml" ? " as TOML tables" : guide.format === "cli" ? " (or are added with the CLI)" : ""}.
          </p>
        </section>

        <section aria-labelledby="transports" className="mt-10">
          <h2 id="transports" className="text-lg font-semibold">What {target.name} can run</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["stdio", "Local servers (stdio)"],
                ["http", "Remote servers (HTTP)"],
                ["sse", "Remote servers (SSE)"],
              ] as const
            ).map(([k, label]) => (
              <li key={k} className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-sm">
                {guide.transports[k] ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" aria-label="Supported" />
                ) : (
                  <XCircle className="h-4 w-4 text-danger" aria-label="Not supported" />
                )}
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            {native.length.toLocaleString("en-US")} of the {mcps.length.toLocaleString("en-US")} servers in the catalog
            run natively in {target.name}
            {!guide.transports.http
              ? "; the rest work through the mcp-remote bridge, which the generated configs include automatically"
              : ""}
            .
          </p>
        </section>

        <section aria-labelledby="steps" className="mt-10">
          <h2 id="steps" className="text-lg font-semibold">Step by step</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-brand-2">
            {guide.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted">
            <span className="font-medium text-foreground">Reloading:</span> {guide.reload}
          </p>
        </section>

        {example && exampleSteps.length > 0 && (
          <section aria-labelledby="example" className="mt-10">
            <h2 id="example" className="text-lg font-semibold">
              Example: the {example.name} server in {target.name}
            </h2>
            <p className="mt-1 mb-3 text-sm text-muted">
              The official reference server for file access. Replace the directory with the folder you want the
              assistant to see.
            </p>
            {exampleSteps.map((s) => (
              <div key={s.label} className="mb-3">
                <p className="mb-1.5 text-xs text-muted">{s.label}</p>
                <CodeBlock code={s.code!} language={s.language} />
              </div>
            ))}
          </section>
        )}

        <section aria-labelledby="troubleshooting" className="mt-10">
          <h2 id="troubleshooting" className="flex items-center gap-2 text-lg font-semibold">
            <Wrench className="h-5 w-5 text-warn" aria-hidden /> Troubleshooting
          </h2>
          <dl className="mt-3 space-y-3">
            {guide.troubleshooting.map((t) => (
              <div key={t.problem} className="rounded-xl border border-border bg-surface/60 px-4 py-3">
                <dt className="text-sm font-medium text-foreground">{t.problem}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{t.fix}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">
            Official documentation:{" "}
            <a href={guide.docsUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              {target.name} MCP docs
            </a>
          </p>
        </section>

        <div className="mt-10 rounded-2xl border border-border bg-surface/60 p-5">
          <p className="text-sm text-foreground">Setting up several servers at once?</p>
          <p className="mt-1 text-sm text-muted">
            Tick them in the catalog and the setup builder merges them into one {target.name} config.
          </p>
          {/* nofollow: ?client= canonicalises to /setup. */}
          <Link
            href={`/setup?client=${target.id}`}
            rel="nofollow"
            className="ring-focus mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm text-brand hover:underline"
          >
            Open the setup builder for {target.name} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </article>

      {top.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <h2 className="mb-2 text-lg font-semibold">Best MCP servers for {target.name}</h2>
          <p className="mb-4 text-sm text-muted">
            The highest health scores among servers that run natively in {target.name}.
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((m) => (
              <li key={m.id}>
                <ResourceCard item={mcpToCard(m)} />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <Link href={`/mcps?client=${target.id}`} rel="nofollow" className="text-brand hover:underline">
              See every server that runs in {target.name} →
            </Link>
          </p>
        </section>
      )}
    </>
  );
}
