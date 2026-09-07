import type { MetadataRoute } from "next";
import { skills, mcps, repos, meta } from "@/lib/data";
import { SITE_URL, categoryPath, resourcePath } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(meta.updatedAt);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/skills`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/mcps`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/repos`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
  ];

  // Each category is a real statically-rendered route with its own canonical,
  // so it can be indexed independently of the parent catalog.
  const categoryRoutes: MetadataRoute.Sitemap = (
    [
      ["skills", meta.categories.skills],
      ["mcps", meta.categories.mcps],
      ["repos", meta.categories.repos],
    ] as const
  ).flatMap(([kind, cats]) =>
    Object.keys(cats).map((name) => ({
      url: `${SITE_URL}${categoryPath(kind, name)}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  const skillRoutes: MetadataRoute.Sitemap = skills.map((s) => ({
    url: `${SITE_URL}${resourcePath("skills", s.slug)}`,
    lastModified: updated,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const mcpRoutes: MetadataRoute.Sitemap = mcps.map((m) => ({
    url: `${SITE_URL}${resourcePath("mcps", m.slug)}`,
    lastModified: m.updatedAt ? new Date(m.updatedAt) : updated,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const repoRoutes: MetadataRoute.Sitemap = repos.map((r) => ({
    url: `${SITE_URL}${resourcePath("repos", r.slug)}`,
    lastModified: r.updatedAt ? new Date(r.updatedAt) : updated,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...skillRoutes, ...mcpRoutes, ...repoRoutes];
}
