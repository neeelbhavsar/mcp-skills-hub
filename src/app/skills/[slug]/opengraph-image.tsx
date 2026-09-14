import { notFound } from "next/navigation";
import { getSkill } from "@/lib/data";
import { renderResourceOg, OG_SIZE, OG_CONTENT_TYPE } from "@/components/og/resource-og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Deliberately no generateStaticParams: prebuilding one Satori render per
// resource was 700 of the build's 2,120 pages and ~39% of its wall time, every
// single day. Rendered on first request and cached at the edge instead, which
// costs one invocation the first time a card is scraped rather than 21,000
// renders a month.
export const dynamicParams = true;

export const alt = "Agent skill on AI Library";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getSkill(slug);
  if (!item) notFound();
  return renderResourceOg({
    kind: "skills",
    title: item.name.replace(/-/g, " "),
    description: item.description,
    meta: `by ${item.author}`,
  });
}
