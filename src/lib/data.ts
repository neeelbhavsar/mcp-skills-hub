import skillsJson from "@/data/skills.json";
import mcpsJson from "@/data/mcps.json";
import reposJson from "@/data/repos.json";
import metaJson from "@/data/meta.json";
import changesJson from "@/data/changes.json";
import type { Skill, Mcp, Repo, Meta, CatalogChanges, ToolInput } from "./types";
import { skillToCard, mcpToCard, repoToCard, toPaletteItem, toolIndexOf, type PaletteItem, type ToolIndexEntry } from "./view";
import { serverEntry, type ServerEntry } from "./ai-targets";
import { isInstallable } from "./compat";

export const skills = skillsJson as Skill[];
export const mcps = mcpsJson as Mcp[];
export const repos = reposJson as Repo[];
export const meta = metaJson as Meta;
export const changes = changesJson as CatalogChanges;

/** Sorted, unique category list with counts for a resource kind. */
export function categoriesOf(record: Record<string, number>) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function getSkill(slug: string) {
  return skills.find((s) => s.slug === slug);
}
export function getMcp(slug: string) {
  return mcps.find((m) => m.slug === slug);
}
export function getRepo(slug: string) {
  return repos.find((r) => r.slug === slug);
}

/** Curated "featured" picks for the landing page previews. */
export const featured = {
  skills: skills.filter((s) => s.source.includes("Anthropic") || s.source.includes("Official")).slice(0, 6),
  mcps: mcps.filter(isInstallable).slice(0, 6),
  repos: [...repos].sort((a, b) => b.stars - a.stars).slice(0, 6),
};

/**
 * Flat, slim index of every resource — handed to the global ⌘K palette so one
 * search spans all three catalogs.
 */
export const paletteIndex: PaletteItem[] = [
  ...skills.map(skillToCard),
  ...mcps.map(mcpToCard),
  ...repos.map(repoToCard),
].map(toPaletteItem);

/**
 * Launch details for every MCP server, handed to the setup builder so it can
 * assemble a merged config entirely client-side.
 */
export const setupIndex: ServerEntry[] = mcps.map(serverEntry);

/**
 * Most recently published MCP servers. Every registry entry carries a publish
 * timestamp, so "what changed" is free — and it is the main reason to come
 * back to a directory more than once.
 */
export const recentMcps = [...mcps]
  .filter((m) => m.updatedAt)
  .sort((a, b) => Date.parse(b.updatedAt!) - Date.parse(a.updatedAt!))
  .slice(0, 6);

/** Every discovered tool, flattened for the tool search. */
export const toolIndex: ToolIndexEntry[] = toolIndexOf(mcps);

/**
 * Tools folded into the ⌘K index, so searching "create_issue" finds the
 * server that exposes it and not just servers whose blurb mentions issues.
 */
export const paletteWithTools: PaletteItem[] = [
  ...paletteIndex,
  ...toolIndex.map((t) => ({
    kind: "mcps" as const,
    id: `tool:${t.slug}:${t.tool}`,
    slug: t.slug,
    title: t.tool,
    description: `Tool on ${t.server}${t.description ? ` — ${t.description}` : ""}`,
    category: "Tool",
    search: `${t.tool} ${t.description ?? ""} ${t.server}`.toLowerCase(),
  })),
];

/** Servers whose tools we know about, for the "N tools" counts. */
export const toolCount = toolIndex.length;

/**
 * Other servers a reader might have meant. Category alone is too coarse (79
 * servers share one), so overlapping tool names count for more — two servers
 * exposing `search_docs` are genuinely interchangeable in a way two "AI &
 * Memory" entries are not.
 */
export function alternativesTo(target: Mcp, limit = 4): Mcp[] {
  const targetTools = new Set((target.tools ?? []).map((t) => t.name.toLowerCase()));
  const words = new Set(
    `${target.name} ${target.description}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 4),
  );

  return mcps
    .filter((m) => m.slug !== target.slug && m.name !== target.name)
    .map((m) => {
      let score = 0;
      if (m.category === target.category) score += 2;

      const shared = (m.tools ?? []).filter((t) => targetTools.has(t.name.toLowerCase())).length;
      score += shared * 4;

      const overlap = `${m.name} ${m.description}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 4 && words.has(w)).length;
      score += Math.min(overlap, 4);

      return { m, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || (b.m.stars ?? -1) - (a.m.stars ?? -1))
    .slice(0, limit)
    .map((x) => x.m);
}

/**
 * Tools grouped by name, one entry per distinct tool across the catalog.
 *
 * The tool search at /tools is client-side, so crawlers never see any of it.
 * These give each tool name a real, static, indexable page — "mcp server with
 * a create_issue tool" is exactly how someone searches for this, and it is
 * the largest long-tail surface the catalog has.
 */
export interface ToolPage {
  slug: string;
  name: string;
  /** Servers exposing a tool with this name. */
  providers: { server: Mcp; description: string | null; inputs: ToolInput[] | null }[];
}

/** Tool names are already identifier-shaped; normalize for use in a URL. */
export function toolSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const toolPageMap = (() => {
  const map = new Map<string, ToolPage>();
  for (const server of mcps) {
    for (const tool of server.tools ?? []) {
      const slug = toolSlug(tool.name);
      if (!slug) continue;
      const existing = map.get(slug);
      const provider = { server, description: tool.description, inputs: tool.inputs };
      if (existing) existing.providers.push(provider);
      else map.set(slug, { slug, name: tool.name, providers: [provider] });
    }
  }
  // Most-provided first, so the listing leads with tools that matter.
  for (const page of map.values()) {
    page.providers.sort((a, b) => (b.server.stars ?? -1) - (a.server.stars ?? -1));
  }
  return map;
})();

export const toolPages: ToolPage[] = [...toolPageMap.values()].sort(
  (a, b) => b.providers.length - a.providers.length || a.name.localeCompare(b.name),
);

export function getToolPage(slug: string) {
  return toolPageMap.get(slug);
}
