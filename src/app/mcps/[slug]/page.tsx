import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mcps, getMcp } from "@/lib/data";
import { mcpToCard } from "@/lib/view";
import { ResourceDetail } from "@/components/catalog/resource-detail";
import { resourcePath, OG_IMAGE } from "@/lib/seo";

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
  const title = mcp.name;
  const description = mcp.description;
  const path = resourcePath("mcps", slug);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title: `${title} — AI Library`, description, images: [OG_IMAGE] },
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
