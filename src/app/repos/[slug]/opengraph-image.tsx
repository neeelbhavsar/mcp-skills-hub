import { notFound } from "next/navigation";
import { repos, getRepo } from "@/lib/data";
import { renderResourceOg, OG_SIZE, OG_CONTENT_TYPE } from "@/components/og/resource-og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "GitHub repo on AI Library";

export function generateStaticParams() {
  return repos.map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getRepo(slug);
  if (!item) notFound();
  return renderResourceOg({
    kind: "repos",
    title: item.name,
    description: item.description,
    meta: item.fullName,
  });
}
