import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { toolPages, getToolPage } from "@/lib/data";
import { launchFor } from "@/lib/compat";
import { healthOf } from "@/lib/health";
import { HealthPill } from "@/components/catalog/health-badge";
import { PageHeader } from "@/components/layout/page-header";
import { absoluteUrl, breadcrumbJsonLd, resourcePath, OG_IMAGE } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return toolPages.map((t) => ({ slug: t.slug }));
}

/** One line describing what this tool is, reused for the meta description. */
function summarize(name: string, providers: number, description: string | null) {
  const who = providers === 1 ? "1 MCP server" : `${providers} MCP servers`;
  const what = description ? ` ${description}` : "";
  return `${who} in the AI Library catalog expose a \`${name}\` tool.${what}`.slice(0, 300);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) return {};

  const title = `${page.name} — MCP tool`;
  const description = summarize(page.name, page.providers.length, page.providers[0]?.description ?? null);
  const path = `/tools/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title: `${title} — AI Library`, description, images: [OG_IMAGE] },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) notFound();

  const description = page.providers.find((p) => p.description)?.description ?? null;

  // The question people actually type, answered in the markup.
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Tools", path: "/tools" },
      { name: page.name, path: `/tools/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Which MCP server has a ${page.name} tool?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${page.providers.map((p) => p.server.name).join(", ")}. See ${absoluteUrl(`/tools/${slug}`)}.`,
          },
        },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow="MCP tool"
        title={page.name}
        highlight=""
        subtitle={
          description ??
          `Exposed by ${page.providers.length} server${page.providers.length === 1 ? "" : "s"} in the catalog.`
        }
      />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Wrench className="h-4 w-4 text-brand-2" />
          Servers exposing <code className="font-mono text-brand-2">{page.name}</code>
        </h2>

        <ul className="mt-4 space-y-4">
          {page.providers.map(({ server, description: providerDescription, inputs }) => {
            const launch = launchFor(server);
            return (
              <li key={server.slug} className="rounded-xl border border-border bg-surface/60 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={resourcePath("mcps", server.slug)}
                    className="ring-focus text-sm font-semibold text-foreground hover:text-brand"
                  >
                    {server.name}
                  </Link>
                  <HealthPill health={healthOf(server)} />
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-2">
                    {launch.mode === "remote" ? launch.transport.toUpperCase() : "stdio"}
                  </span>
                </div>

                {providerDescription && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">{providerDescription}</p>
                )}

                {inputs && inputs.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-muted-2">
                          <th className="pb-2 pr-3 font-medium">Parameter</th>
                          <th className="pb-2 pr-3 font-medium">Type</th>
                          <th className="pb-2 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="align-top">
                        {inputs.map((input) => (
                          <tr key={input.name} className="border-t border-border/40">
                            <td className="py-1.5 pr-3">
                              <code className="font-mono text-foreground">{input.name}</code>
                              {input.required && <span className="ml-1 text-danger">*</span>}
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-muted-2">{input.type}</td>
                            <td className="py-1.5 text-muted">{input.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Link
                  href={resourcePath("mcps", server.slug)}
                  className="ring-focus mt-3 inline-block text-xs text-brand hover:underline"
                >
                  Install {server.name} →
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-xs leading-relaxed text-muted-2">
          Tool lists are read from the live servers each morning, so this reflects what they were exposing at
          the last refresh.{" "}
          <Link href="/tools" className="text-brand hover:underline">
            Search all tools
          </Link>
          .
        </p>
      </section>
    </>
  );
}
