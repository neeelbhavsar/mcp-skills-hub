import type { MetadataRoute } from "next";
import { skills, mcps, repos, meta, toolPages } from "@/lib/data";
import { USE_CASES } from "@/lib/use-cases";
import { STACKS } from "@/lib/stacks";
import { AI_TARGETS } from "@/lib/ai-targets";
import { isIndexableTool } from "@/lib/tool-index";
import { categoriesFor, listingPath, pageParams } from "@/lib/listings";
import { SITE_URL, resourcePath } from "@/lib/seo";
import type { ResourceKind } from "@/lib/types";

/**
 * `lastModified` is only set where it is actually known. Stamping the build
 * time on every URL made 24% of entries share one timestamp that described
 * the deploy, not the page — which tells Google nothing. `changefreq` and
 * `priority` are gone: Google ignores both.
 */
const date = (iso: string | null | undefined) => {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : new Date(t);
};

const newest = (dates: (string | null | undefined)[]) =>
  dates.reduce<Date | undefined>((acc, d) => {
    const v = date(d);
    return v && (!acc || v > acc) ? v : acc;
  }, undefined);

export default function sitemap(): MetadataRoute.Sitemap {
  const refreshed = new Date(meta.updatedAt);
  const url = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
  });

  // Pages whose content is the daily catalog itself genuinely change with it.
  const live = ["/", "/mcps", "/skills", "/repos", "/tools", "/whats-new", "/best-mcp-servers"].map((p) =>
    url(p, refreshed),
  );
  const editorial = ["/use-cases", "/stacks", "/setup", "/clients", "/health-score", "/about", "/developers", "/submit"].map(
    (p) => url(p),
  );

  const clientRoutes = AI_TARGETS.map((t) => url(`/clients/${t.id}`));
  const stackRoutes = STACKS.map((s) => url(`/stacks/${s.slug}`));
  const useCaseRoutes = USE_CASES.map((u) => url(`/use-cases/${u.slug}`));

  // Only tools with more than one provider; single-provider pages are
  // noindex (see lib/tool-index.ts) and must not be submitted.
  const toolRoutes = toolPages
    .filter((t) => isIndexableTool(t.name, t.providers.length))
    .map((t) => url(`/tools/${t.slug}`, newest(t.providers.map((p) => p.server.updatedAt))));

  // Category pages and every page past the first, so crawlers can reach
  // entries beyond the first 24 of each listing.
  const kinds: ResourceKind[] = ["mcps", "skills", "repos"];
  const listingRoutes = kinds.flatMap((kind) => [
    ...pageParams(kind, null).map((p) => url(listingPath(kind, null, Number(p.n)), refreshed)),
    ...categoriesFor(kind).flatMap((c) => [
      url(listingPath(kind, c.name), refreshed),
      ...pageParams(kind, c.name).map((p) => url(listingPath(kind, c.name, Number(p.n)), refreshed)),
    ]),
  ]);

  const mcpRoutes = mcps.map((m) => url(resourcePath("mcps", m.slug), date(m.updatedAt)));
  const skillRoutes = skills.map((s) => url(resourcePath("skills", s.slug), date(s.repoMeta?.pushedAt)));
  const repoRoutes = repos.map((r) => url(resourcePath("repos", r.slug), date(r.updatedAt)));

  return [
    ...live,
    ...editorial,
    ...clientRoutes,
    ...stackRoutes,
    ...useCaseRoutes,
    ...listingRoutes,
    ...toolRoutes,
    ...mcpRoutes,
    ...skillRoutes,
    ...repoRoutes,
  ];
}
