import type { MetadataRoute } from "next";
import { skills, mcps, repos, meta } from "@/lib/data";
import { USE_CASES } from "@/lib/use-cases";
import { STACKS } from "@/lib/stacks";
import { SITE_URL, categoryPath, resourcePath } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(meta.updatedAt);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/skills`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/mcps`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/repos`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/use-cases`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/setup`, lastModified: updated, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tools`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/stacks`, lastModified: updated, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/whats-new`, lastModified: updated, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/health-score`, lastModified: updated, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/submit`, lastModified: updated, changeFrequency: "monthly", priority: 0.5 },
  ];

  const stackRoutes: MetadataRoute.Sitemap = STACKS.map((s) => ({
    url: `${SITE_URL}/stacks/${s.slug}`,
    lastModified: updated,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Task-oriented pages: how people actually phrase the search.
  const useCaseRoutes: MetadataRoute.Sitemap = USE_CASES.map((u) => ({
    url: `${SITE_URL}/use-cases/${u.slug}`,
    lastModified: updated,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

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

  return [...staticRoutes, ...stackRoutes, ...useCaseRoutes, ...categoryRoutes, ...skillRoutes, ...mcpRoutes, ...repoRoutes];
}
