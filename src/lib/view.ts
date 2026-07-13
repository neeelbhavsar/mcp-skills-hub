import type { Skill, Mcp, Repo, ResourceKind } from "./types";

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
  raw: Skill | Mcp | Repo;
  search: string;
}

export function skillToCard(s: Skill): CardItem {
  return {
    kind: "skills",
    id: s.id,
    slug: s.slug,
    title: s.name.replace(/-/g, " "),
    description: s.description,
    category: s.category,
    stars: s.stars,
    pills: [
      { label: s.source, tone: s.source.includes("Anthropic") ? "brand" : "default" },
      ...(s.skills.length ? [{ label: `${s.skills.length} skills`, tone: "accent" as const }] : []),
    ],
    footer: `by ${s.author}`,
    externalUrl: s.sourceUrl,
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
    raw: r,
    search: `${r.fullName} ${r.description} ${r.category} ${r.topics.join(" ")}`.toLowerCase(),
  };
}
