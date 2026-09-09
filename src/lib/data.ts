import skillsJson from "@/data/skills.json";
import mcpsJson from "@/data/mcps.json";
import reposJson from "@/data/repos.json";
import metaJson from "@/data/meta.json";
import changesJson from "@/data/changes.json";
import type { Skill, Mcp, Repo, Meta, CatalogChanges } from "./types";
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
