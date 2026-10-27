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
 * One sitemap per section, served at /sitemaps/sitemap/<id>.xml and listed
 * by the index at /sitemap.xml. Crawling doesn't need the split at this
 * size, but Search Console reports indexed-vs-submitted per sitemap, which is
 * how you see whether e.g. tool pages are being indexed at all.
 *
 * `lastModified` is only set where it is actually known. Stamping the build
 * time on every URL made 24% of entries share one timestamp that described
 * the deploy, not the page. `changefreq` and `priority` are gone: Google
 * ignores both.
 */
export const SITEMAP_IDS = ["pages", "listings", "tools", "mcps", "skills", "repos"] as const;

export function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

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

const url = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
  url: `${SITE_URL}${path}`,
  ...(lastModified ? { lastModified } : {}),
});

function section(id: string): MetadataRoute.Sitemap {
  const refreshed = new Date(meta.updatedAt);
  switch (id) {
    case "pages":
      return [
        // Pages whose content is the daily catalog itself genuinely change with it.
        ...["/", "/mcps", "/skills", "/repos", "/tools", "/whats-new", "/best-mcp-servers"].map((p) => url(p, refreshed)),
        ...["/use-cases", "/stacks", "/setup", "/clients", "/agent-skills", "/health-score", "/about", "/developers", "/submit"].map(
          (p) => url(p),
        ),
        ...AI_TARGETS.map((t) => url(`/clients/${t.id}`)),
        ...STACKS.map((s) => url(`/stacks/${s.slug}`)),
        ...USE_CASES.map((u) => url(`/use-cases/${u.slug}`)),
      ];
    case "listings": {
      // Category pages and every page past the first, so crawlers can reach
      // entries beyond the first 24 of each listing.
      const kinds: ResourceKind[] = ["mcps", "skills", "repos"];
      return kinds.flatMap((kind) => [
        ...pageParams(kind, null).map((p) => url(listingPath(kind, null, Number(p.n)), refreshed)),
        ...categoriesFor(kind).flatMap((c) => [
          url(listingPath(kind, c.name), refreshed),
          ...pageParams(kind, c.name).map((p) => url(listingPath(kind, c.name, Number(p.n)), refreshed)),
        ]),
      ]);
    }
    case "tools":
      // Only tools with more than one provider; single-provider pages are
      // noindex (see lib/tool-index.ts) and must not be submitted.
      return toolPages
        .filter((t) => isIndexableTool(t.name, t.providers.length))
        .map((t) => url(`/tools/${t.slug}`, newest(t.providers.map((p) => p.server.updatedAt))));
    case "mcps":
      return mcps.map((m) => url(resourcePath("mcps", m.slug), date(m.updatedAt)));
    case "skills":
      return skills.map((s) => url(resourcePath("skills", s.slug), date(s.repoMeta?.pushedAt)));
    case "repos":
      return repos.map((r) => url(resourcePath("repos", r.slug), date(r.updatedAt)));
    default:
      return [];
  }
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  return section(await id);
}
