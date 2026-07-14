import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { skills, getSkill } from "@/lib/data";
import { skillToCard } from "@/lib/view";
import { ResourceDetail } from "@/components/catalog/resource-detail";
import { resourcePath, OG_IMAGE } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return skills.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) return {};
  const title = skill.name.replace(/-/g, " ");
  const description = skill.description;
  const path = resourcePath("skills", slug);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title: `${title} — AI Library`, description, images: [OG_IMAGE] },
  };
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) notFound();
  return <ResourceDetail item={skillToCard(skill)} />;
}
