import { notFound } from "next/navigation";
import { skills, getSkill } from "@/lib/data";
import { renderResourceOg, OG_SIZE, OG_CONTENT_TYPE } from "@/components/og/resource-og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Agent skill on AI Library";

export function generateStaticParams() {
  return skills.map((r) => ({ slug: r.slug }));
}

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
