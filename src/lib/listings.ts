import type { Metadata } from "next";
import { mcps, skills, repos, meta, categoriesOf } from "./data";
import { mcpToCard, skillToCard, repoToCard, toCatalogCard, type CardItem, type CatalogCard } from "./view";
import type { ResourceKind } from "./types";
import { CATALOG_PAGE_SIZE, KIND_META, OG_IMAGE, categoryPath, categorySlug, ogTitle, pagePath } from "./seo";

/**
 * Everything the catalog listings share: the base catalogs (/mcps), their
 * category pages (/mcps/category/x) and the crawlable page routes under both
 * (/mcps/page/2, /mcps/category/x/page/2). One definition, so the copy, the
 * ordering the page routes slice, and the metadata cannot drift apart.
 */

interface ListingCopy {
  description: string;
  title: string;
  eyebrow: string;
  heading: string;
  highlight: string;
  subtitle: string;
}

export const LISTING_COPY: Record<ResourceKind, ListingCopy> = {
  mcps: {
    title: "MCP Servers",
    description:
      "Browse Model Context Protocol servers. Copy-paste install configs for Claude, Cursor, Windsurf, VS Code, Codex and more.",
    eyebrow: "Model Context Protocol",
    heading: "Connect your AI to anything with",
    highlight: "MCP Servers",
    subtitle:
      "MCP servers give your assistant real tools — databases, browsers, APIs, files. Every server here ships with ready-to-paste config for each AI client.",
  },
  skills: {
    title: "Agent Skills",
    description:
      "Browse Agent Skills for Claude, Cursor, Codex and more. Learn how to install and use each one in any assistant.",
    eyebrow: "Agent Skills",
    heading: "Supercharge your AI with",
    highlight: "Skills",
    subtitle:
      "Reusable capabilities that teach your assistant a domain — from document processing to design. Add them to Claude Code, Cursor, Codex and beyond with copy-paste steps.",
  },
  repos: {
    title: "GitHub Repos for AI",
    description:
      "Top GitHub repos for AI workflows — agents, RAG, LLM frameworks and tooling. Learn how to use each in your AI editor.",
    eyebrow: "Curated GitHub",
    heading: "The best AI repos to",
    highlight: "build with",
    subtitle:
      "Hand-picked, star-ranked repositories for agents, RAG, LLM frameworks and coding assistants — with steps to clone and wire each one into your AI editor.",
  },
};

function cardsOf(kind: ResourceKind): CardItem[] {
  if (kind === "mcps") return mcps.map(mcpToCard);
  if (kind === "skills") return skills.map(skillToCard);
  return repos.map(repoToCard);
}

/** The default "Popular" order — the one the grid starts in and the page routes slice. */
const byPopularity = (a: CatalogCard, b: CatalogCard) => (b.stars ?? -1) - (a.stars ?? -1);

export function categoriesFor(kind: ResourceKind) {
  return categoriesOf(meta.categories[kind]);
}

/** Resolve a category URL slug back to its display name. */
export function categoryFromSlug(kind: ResourceKind, slug: string) {
  return Object.keys(meta.categories[kind]).find((name) => categorySlug(name) === slug) ?? null;
}

/** Items in scope for a listing, slimmed for the client and in default order. */
export function listingItems(kind: ResourceKind, category: string | null): CatalogCard[] {
  return cardsOf(kind)
    .filter((c) => !category || c.category === category)
    .map(toCatalogCard)
    .sort(byPopularity);
}

export function listingPageCount(kind: ResourceKind, category: string | null) {
  return Math.max(1, Math.ceil(listingItems(kind, category).length / CATALOG_PAGE_SIZE));
}

/** `generateStaticParams` for the page routes: pages 2..N (page 1 is the listing itself). */
export function pageParams(kind: ResourceKind, category: string | null) {
  const count = listingPageCount(kind, category);
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({ n: String(i + 2) }));
}

/** Parse a page segment; null for anything that isn't a real page past the first. */
export function parsePage(n: string, kind: ResourceKind, category: string | null) {
  if (!/^\d+$/.test(n)) return null;
  const page = Number(n);
  return page >= 2 && page <= listingPageCount(kind, category) ? page : null;
}

export function listingPath(kind: ResourceKind, category: string | null, page = 1) {
  return pagePath(category ? categoryPath(kind, category) : KIND_META[kind].path, page);
}

/** Category-page copy, including a short line naming its leading entries. */
export function categoryCopy(kind: ResourceKind, category: string) {
  const { label, singular } = KIND_META[kind];
  const items = listingItems(kind, category);
  const leaders = items.slice(0, 3).map((i) => i.title);
  const count = items.length;
  const noun = count === 1 ? singular : label;
  const lead =
    leaders.length > 1
      ? ` The most-starred are ${leaders.slice(0, -1).join(", ")} and ${leaders.at(-1)}.`
      : "";
  return {
    title: `${category} ${label}`,
    // Category names keep their casing: lowercasing turned "AI Agents" into "ai agents".
    description: `${count} ${category} ${noun} for Claude, Cursor, Codex, Windsurf and VS Code, with copy-paste setup for each client.`,
    subtitle: `${count} ${noun.toLowerCase()} in ${category}, each with ready-to-paste setup for your AI client.${lead}`,
  };
}

export function listingMetadata(kind: ResourceKind, category: string | null, page: number): Metadata {
  const copy = LISTING_COPY[kind];
  const base = category ? categoryCopy(kind, category) : { title: copy.title, description: copy.description };
  const pageSuffix = page > 1 ? ` — page ${page}` : "";
  const title = `${base.title}${pageSuffix}`;
  const path = listingPath(kind, category, page);
  return {
    title,
    description: page > 1 ? `${base.description} Page ${page}.` : base.description,
    // Every page is its own canonical: page 2 is not a duplicate of page 1.
    alternates: { canonical: path },
    openGraph: { url: path, title: ogTitle(title), description: base.description, images: [OG_IMAGE] },
  };
}
