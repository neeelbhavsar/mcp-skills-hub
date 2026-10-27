import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { skills, getSkill } from "@/lib/data";
import { skillTitle, skillToCard } from "@/lib/view";
import { ResourceDetail } from "@/components/catalog/resource-detail";
import { detailTitle, ogTitle, resourcePath } from "@/lib/seo";
import { clip } from "@/lib/utils";

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
  const name = skillTitle(skill.name);
  const title = detailTitle(name, /skill/i.test(name) ? "" : "Agent Skill", "install in Claude Code & Cursor");
  const description = clip(skill.description || `${name}, an Agent Skill by ${skill.author}, with setup steps for every AI client.`);
  const path = resourcePath("skills", slug);
  return {
    title,
    description,
    alternates: { canonical: path, types: { "text/markdown": `/md/skills/${slug}` } },
    // og:image comes from the sibling opengraph-image.tsx.
    openGraph: { type: "website", url: path, title: ogTitle(`${name} — Agent Skill`), description },
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
