import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { toolPages, getToolPage } from "@/lib/data";
import { launchFor } from "@/lib/compat";
import { healthOf } from "@/lib/health";
import { HealthPill } from "@/components/catalog/health-badge";
import { PageHeader } from "@/components/layout/page-header";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, ogTitle, resourcePath } from "@/lib/seo";
import { isIndexableTool } from "@/lib/tool-index";
import { clip } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return toolPages.map((t) => ({ slug: t.slug }));
}

/** One line describing what this tool is, reused for the meta description. */
function summarize(name: string, providers: string[], description: string | null) {
  // Grammar used to be "1 MCP server … expose", with literal backticks.
  const who =
    providers.length === 1
      ? `${providers[0]} exposes`
      : `${providers.length} MCP servers expose`;
  const what = description ? ` ${description}` : "";
  return clip(`${who} a ${name} tool.${what}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) return {};

  const servers = page.providers.map((p) => p.server.name);
  const title =
    servers.length > 1 ? `${page.name} — MCP tool on ${servers.length} servers` : `${page.name} — MCP tool (${servers[0]})`;
  const description = summarize(page.name, servers, page.providers.find((p) => p.description)?.description ?? null);
  const path = `/tools/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    // og:image comes from the sibling opengraph-image.tsx.
    openGraph: { type: "website", url: path, title: ogTitle(title), description },
    // A tool exposed by a single server restates a row of that server's page.
    // The page stays live and linked; it just stays out of the index.
    ...(isIndexableTool(page.name, page.providers.length)
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) notFound();

  const description = page.providers.find((p) => p.description)?.description ?? null;
  const count = page.providers.length;

  // An ItemList of the servers providing it. This was a one-question FAQPage,
  // which earns no rich result outside government and health sites.
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Tools", path: "/tools" },
      { name: page.name, path: `/tools/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `MCP servers with a ${page.name} tool`,
      numberOfItems: count,
      itemListElement: page.providers.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(resourcePath("mcps", p.server.slug)),
        name: p.server.name,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader
        eyebrow="MCP tool"
        title={page.name}
        highlight=""
        subtitle={description ?? `Exposed by ${count} server${count === 1 ? "" : "s"} in the catalog.`}
      />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* The direct answer, as a sentence rather than only a list. */}
        <p className="mb-8 text-base leading-relaxed text-muted">
          {count === 1 ? (
            <>
              The <code className="font-mono text-foreground">{page.name}</code> tool is provided by{" "}
              <Link href={resourcePath("mcps", page.providers[0].server.slug)} className="text-brand hover:underline">
                {page.providers[0].server.name}
              </Link>
              . Install that server in your AI client and the assistant can call it directly.
            </>
          ) : (
            <>
              {count} MCP servers expose a <code className="font-mono text-foreground">{page.name}</code> tool:{" "}
              {page.providers.map((p, i) => (
                <span key={p.server.slug}>
                  {i > 0 && (i === count - 1 ? " and " : ", ")}
                  <Link href={resourcePath("mcps", p.server.slug)} className="text-brand hover:underline">
                    {p.server.name}
                  </Link>
                </span>
              ))}
              . Their input schemas differ, so compare them below before picking one.
            </>
          )}
        </p>

        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Wrench className="h-4 w-4 text-brand-2" aria-hidden />
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
                  <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">
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
                        <tr className="text-muted">
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
                            <td className="py-1.5 pr-3 font-mono text-muted">{input.type}</td>
                            <td className="py-1.5 text-muted">{input.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Link
                  href={`${resourcePath("mcps", server.slug)}#install`}
                  className="ring-focus mt-3 inline-flex min-h-10 items-center text-xs text-brand hover:underline"
                >
                  Install {server.name} →
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-xs leading-relaxed text-muted">
          Tool lists are read from the live servers (or, for packaged servers, from their documentation) each
          morning, so this reflects what they exposed at the last refresh.{" "}
          <Link href="/tools" className="text-brand hover:underline">
            Search all tools
          </Link>
          .
        </p>
      </section>
    </>
  );
}
