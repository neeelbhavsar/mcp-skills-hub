import type { Skill, Mcp, Repo, ResourceKind } from "./types";
import { launchFor } from "./compat";
import { overallLevel, trustSignals } from "./trust";
import { toolSlug } from "./utils";

export interface Pill {
  label: string;
  tone?: "default" | "brand" | "accent";
}

/** Normalized card view-model shared by all three catalogs. */
export interface CardItem {
  kind: ResourceKind;
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  stars: number | null;
  pills: Pill[];
  footer: string;
  externalUrl: string;
  /** ISO timestamp, when the source provides one — powers the "Recent" sort. */
  updatedAt: string | null;
  /** MCP-only: how the server launches, for the client-compatibility filter. */
  launchMode?: "stdio" | "remote" | "unknown";
  /** MCP-only: worst trust signal, surfaced as a card badge. */
  trust?: "good" | "caution" | "risk" | "neutral";
  raw: Skill | Mcp | Repo;
  search: string;
}

/**
 * Display name for a skill. Slug-style names ("pdf-processing") read better
 * with spaces, but replacing hyphens in a name that already has spaces turned
 * "Claude Cookbooks - Skills" into "Claude Cookbooks   Skills".
 */
export function skillTitle(name: string) {
  const spaced = /\s/.test(name) ? name : name.replace(/-/g, " ");
  return spaced.replace(/\s+/g, " ").trim();
}

export function skillToCard(s: Skill): CardItem {
  return {
    kind: "skills",
    id: s.id,
    slug: s.slug,
    title: skillTitle(s.name),
    description: s.description,
    category: s.category,
    stars: s.stars,
    pills: [
      { label: s.source, tone: s.source.includes("Anthropic") ? "brand" : "default" },
      ...(s.skills.length ? [{ label: `${s.skills.length} skills`, tone: "accent" as const }] : []),
    ],
    footer: `by ${s.author}`,
    externalUrl: s.sourceUrl,
    updatedAt: null,
    raw: s,
    search: `${s.name} ${s.description} ${s.category} ${s.source} ${s.author}`.toLowerCase(),
  };
}

export function mcpToCard(m: Mcp): CardItem {
  const runtime = m.packages[0]?.registryType || (m.remotes.length ? "remote" : null);
  return {
    kind: "mcps",
    id: m.id,
    slug: m.slug,
    title: m.name,
    description: m.description,
    category: m.category,
    stars: m.stars,
    pills: [
      { label: m.source, tone: "default" },
      ...(runtime ? [{ label: runtime, tone: "brand" as const }] : []),
      ...(m.tools?.length ? [{ label: `${m.tools.length} tools`, tone: "accent" as const }] : []),
    ],
    footer: m.license ? m.license : m.qualifiedName.split("/")[0],
    externalUrl: m.homepage || m.repository || "#",
    updatedAt: m.updatedAt,
    launchMode: launchFor(m).mode,
    trust: overallLevel(trustSignals(m)),
    raw: m,
    search: `${m.name} ${m.description} ${m.category} ${m.qualifiedName}`.toLowerCase(),
  };
}

export function repoToCard(r: Repo): CardItem {
  return {
    kind: "repos",
    id: r.id,
    slug: r.slug,
    title: r.name,
    description: r.description,
    category: r.category,
    stars: r.stars,
    pills: [
      ...(r.language ? [{ label: r.language, tone: "brand" as const }] : []),
      ...(r.license ? [{ label: r.license, tone: "default" as const }] : []),
    ],
    footer: r.fullName,
    externalUrl: r.url,
    updatedAt: r.updatedAt,
    raw: r,
    search: `${r.fullName} ${r.description} ${r.category} ${r.topics.join(" ")}`.toLowerCase(),
  };
}

/**
 * A card as the catalog listing ships it to the browser: everything the grid,
 * filters and search read, and nothing else. Listings used to pass full
 * CardItems, each carrying its raw source object (README, tool schemas, code
 * inspection), which made /skills and every category page 2.7–3.1 MB of HTML.
 */
export type CatalogCard = Omit<CardItem, "raw" | "externalUrl" | "trust">;

const CARD_DESCRIPTION_MAX = 240;

export function toCatalogCard(card: CardItem): CatalogCard {
  return {
    kind: card.kind,
    id: card.id,
    slug: card.slug,
    title: card.title,
    // The grid clamps to three lines; the full text stays in `search`.
    description:
      card.description.length > CARD_DESCRIPTION_MAX
        ? `${card.description.slice(0, CARD_DESCRIPTION_MAX - 1).replace(/\s+\S*$/, "")}…`
        : card.description,
    category: card.category,
    stars: card.stars,
    pills: card.pills,
    footer: card.footer,
    updatedAt: card.updatedAt,
    ...(card.launchMode ? { launchMode: card.launchMode } : {}),
    search: card.search,
  };
}

/**
 * Slim, serializable record for the global ⌘K palette. Only the fields the
 * palette actually renders or searches — shipping full CardItems (which carry
 * the entire raw source object) would bloat the client bundle by megabytes.
 */
export interface PaletteItem {
  kind: ResourceKind;
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  search: string;
}

export function toPaletteItem(card: CardItem): PaletteItem {
  return {
    kind: card.kind,
    id: card.id,
    slug: card.slug,
    title: card.title,
    description: card.description.length > 110 ? `${card.description.slice(0, 109)}…` : card.description,
    category: card.category,
    search: card.search,
  };
}

/**
 * Flat index of every discovered tool, so "which server has a create_issue
 * tool?" becomes answerable. Only names and one-line descriptions — the full
 * schemas stay on the server pages rather than in the client bundle.
 */
export interface ToolIndexEntry {
  tool: string;
  description: string | null;
  server: string;
  slug: string;
  /** Exposed by more than one server, so it has its own /tools page. */
  shared: boolean;
}

export function toolIndexOf(servers: Mcp[]): ToolIndexEntry[] {
  const counts = new Map<string, number>();
  for (const m of servers) for (const t of m.tools ?? []) counts.set(toolSlug(t.name), (counts.get(toolSlug(t.name)) ?? 0) + 1);
  return servers.flatMap((m) =>
    (m.tools ?? []).map((t) => ({
      tool: t.name,
      description: t.description ? t.description.slice(0, 140) : null,
      server: m.name,
      slug: m.slug,
      shared: (counts.get(toolSlug(t.name)) ?? 0) > 1,
    })),
  );
}

/**
 * Where a tool links. Only tools shared by several servers have a page of
 * their own; a single-server tool lives on its server's page, as an anchor.
 */
export function toolHref(name: string, serverSlug: string, shared: boolean) {
  return shared ? `/tools/${toolSlug(name)}` : `/mcps/${serverSlug}#${toolAnchor(name)}`;
}

export function toolAnchor(name: string) {
  return `tool-${toolSlug(name)}`;
}
