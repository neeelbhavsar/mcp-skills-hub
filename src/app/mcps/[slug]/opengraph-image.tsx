import { notFound } from "next/navigation";
import { mcps, getMcp } from "@/lib/data";
import { renderResourceOg, OG_SIZE, OG_CONTENT_TYPE } from "@/components/og/resource-og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "MCP server on AI Library";

export function generateStaticParams() {
  return mcps.map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getMcp(slug);
  if (!item) notFound();
  return renderResourceOg({
    kind: "mcps",
    title: item.name,
    description: item.description,
    meta: item.qualifiedName,
  });
}
