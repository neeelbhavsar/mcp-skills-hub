import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mcps, getMcp, mcpDescriptionShared, mcpDisambiguator } from "@/lib/data";
import { mcpKindPhrase, mcpToCard } from "@/lib/view";
import { ResourceDetail } from "@/components/catalog/resource-detail";
import { detailTitle, ogTitle, resourcePath } from "@/lib/seo";
import { clip } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return mcps.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mcp = getMcp(slug);
  if (!mcp) return {};
  const by = mcpDisambiguator(mcp);
  const kindPhrase = mcpKindPhrase(mcp.name) + (by ? ` by ${by}` : "");
  const title = detailTitle(mcp.name, kindPhrase, "install in Claude, Cursor & VS Code");
  // Duplicate registry entries share a description word for word; leading
  // with the registry name keeps their snippets distinct.
  const description = clip(mcpDescriptionShared(mcp) ? `${mcp.qualifiedName}: ${mcp.description}` : mcp.description);
  const path = resourcePath("mcps", slug);
  return {
    title,
    description,
    alternates: { canonical: path, types: { "text/markdown": `/md/mcps/${slug}` } },
    // og:image comes from the sibling opengraph-image.tsx.
    openGraph: { type: "website", url: path, title: ogTitle(`${mcp.name} ${kindPhrase}`), description },
  };
}

export default async function McpDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mcp = getMcp(slug);
  if (!mcp) notFound();
  return <ResourceDetail item={mcpToCard(mcp)} />;
}
