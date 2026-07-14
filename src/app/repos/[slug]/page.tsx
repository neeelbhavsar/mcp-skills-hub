import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { repos, getRepo } from "@/lib/data";
import { repoToCard } from "@/lib/view";
import { ResourceDetail } from "@/components/catalog/resource-detail";
import { resourcePath, OG_IMAGE } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return repos.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repo = getRepo(slug);
  if (!repo) return {};
  const title = repo.name;
  const description = repo.description || `${repo.fullName} — a GitHub repository for AI workflows.`;
  const path = resourcePath("repos", slug);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title: `${title} — AI Library`, description, images: [OG_IMAGE] },
  };
}

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = getRepo(slug);
  if (!repo) notFound();
  return <ResourceDetail item={repoToCard(repo)} />;
}
