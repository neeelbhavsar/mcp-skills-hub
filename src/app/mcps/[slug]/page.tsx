import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mcps, getMcp } from "@/lib/data";
import { mcpToCard } from "@/lib/view";
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
  // "Filesystem MCP server", but not "Acme MCP MCP server".
  const kindPhrase = /mcp/i.test(mcp.name) ? "server" : "MCP server";
  const title = detailTitle(mcp.name, kindPhrase, "install in Claude, Cursor & VS Code");
  const description = clip(mcp.description);
  const path = resourcePath("mcps", slug);
  return {
    title,
    description,
    alternates: { canonical: path },
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
