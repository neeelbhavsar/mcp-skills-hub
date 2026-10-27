import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { repos, getRepo } from "@/lib/data";
import { repoToCard } from "@/lib/view";
import { ResourceDetail } from "@/components/catalog/resource-detail";
import { detailTitle, ogTitle, resourcePath } from "@/lib/seo";
import { clip } from "@/lib/utils";

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
  // Bare repo names ("opik") said nothing about the page; owner/name plus
  // what it is reads as a result worth clicking.
  const title = detailTitle(repo.fullName, repo.language ? `(${repo.language})` : "", `${repo.category} GitHub repo`);
  const description = clip(repo.description || `${repo.fullName} — a GitHub repository for AI workflows.`);
  const path = resourcePath("repos", slug);
  return {
    title,
    description,
    alternates: { canonical: path, types: { "text/markdown": `/md/repos/${slug}` } },
    // og:image comes from the sibling opengraph-image.tsx.
    openGraph: { type: "website", url: path, title: ogTitle(repo.fullName), description },
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
