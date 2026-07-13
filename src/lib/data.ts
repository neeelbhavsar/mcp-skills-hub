import skillsJson from "@/data/skills.json";
import mcpsJson from "@/data/mcps.json";
import reposJson from "@/data/repos.json";
import metaJson from "@/data/meta.json";
import type { Skill, Mcp, Repo, Meta } from "./types";

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

/** Curated "featured" picks for the landing page previews. */
export const featured = {
  skills: skills.filter((s) => s.source.includes("Anthropic") || s.source.includes("Official")).slice(0, 6),
  mcps: mcps.filter((m) => m.packages.length > 0).slice(0, 6),
  repos: [...repos].sort((a, b) => b.stars - a.stars).slice(0, 6),
};
