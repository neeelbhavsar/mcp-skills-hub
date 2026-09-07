import skillsJson from "@/data/skills.json";
import mcpsJson from "@/data/mcps.json";
import reposJson from "@/data/repos.json";
import metaJson from "@/data/meta.json";
import type { Skill, Mcp, Repo, Meta } from "./types";
import { skillToCard, mcpToCard, repoToCard, toPaletteItem, type PaletteItem } from "./view";
import { serverEntry, type ServerEntry } from "./ai-targets";
import { isInstallable } from "./compat";

export const skills = skillsJson as Skill[];
export const mcps = mcpsJson as Mcp[];
export const repos = reposJson as Repo[];
export const meta = metaJson as Meta;

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
