import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { renderResourceOg, OG_SIZE, OG_CONTENT_TYPE } from "@/components/og/resource-og";
import { SITE_NAME } from "@/lib/seo";
import { formatStars } from "@/lib/utils";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Rendered on first request and cached at the edge rather than prebuilt —
// see app/mcps/[slug]/opengraph-image.tsx.
export const dynamicParams = true;

export const alt = `GitHub repo on ${SITE_NAME}`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getRepo(slug);
  if (!item) notFound();
  return renderResourceOg({
    kind: "repos",
    title: item.name,
    description: item.description,
    meta: item.fullName,
    badges: [`${formatStars(item.stars)} stars`, ...(item.language ? [item.language] : [])],
  });
}
