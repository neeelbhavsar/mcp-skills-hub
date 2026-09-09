import { mcps } from "./data";
import { isInstallable } from "./compat";
import type { Mcp } from "./types";

/**
 * Curated starter packs.
 *
 * Servers are named by slug so a pack is a real, reviewed selection rather
 * than a keyword query — the point is editorial judgement. Slugs that leave
 * the registry are dropped silently, so a pack degrades instead of 404ing.
 */
export interface Stack {
  slug: string;
  name: string;
  tagline: string;
  /** Why these, in one paragraph. */
  rationale: string;
  /** Preferred picks, in order. */
  servers: string[];
  /** Keywords used to top up the pack when curated picks are unavailable. */
  fallbackKeywords: string[];
}

export const STACKS: Stack[] = [
  {
    slug: "backend-development",
    name: "Backend development",
    tagline: "Read the repo, run git, fetch docs.",
    rationale:
      "The unglamorous basics that make an assistant useful in a service codebase: filesystem access scoped to your project, real git operations, and the ability to fetch documentation without leaving the session.",
    servers: ["official-filesystem", "official-git", "official-fetch"],
    fallbackKeywords: ["git", "filesystem", "fetch", "api"],
  },
  {
    slug: "research-and-writing",
    name: "Research and writing",
    tagline: "Search the web, keep what you learn.",
    rationale:
      "Web fetching for primary sources plus a persistent memory graph, so findings survive between sessions instead of being re-derived every time you open a new chat.",
    servers: ["official-fetch", "official-memory", "official-sequentialthinking"],
    fallbackKeywords: ["search", "web", "docs", "memory"],
  },
  {
    slug: "agent-building",
    name: "Agent building",
    tagline: "Structured reasoning and a test harness.",
    rationale:
      "Sequential thinking for plans an agent can revise mid-flight, the Everything reference server to exercise every MCP feature while you build, and memory for state that outlives a single run.",
    servers: ["official-sequentialthinking", "official-everything", "official-memory"],
    fallbackKeywords: ["agent", "memory", "reasoning"],
  },
  {
    slug: "everyday-assistant",
    name: "Everyday assistant",
    tagline: "Files, time and the web.",
    rationale:
      "A sensible default for a general-purpose assistant: local files, accurate dates (models are famously bad at this), and web access.",
    servers: ["official-filesystem", "official-time", "official-fetch"],
    fallbackKeywords: ["time", "filesystem", "fetch"],
  },
];

const bySlug = new Map(mcps.map((m) => [m.slug, m]));

function matchesKeyword(mcp: Mcp, keywords: string[]) {
  const hay = `${mcp.name} ${mcp.description}`.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

/** Resolve a pack to real servers, topping up from keywords if picks are gone. */
export function resolveStack(stack: Stack, size = 3): Mcp[] {
  const picked: Mcp[] = [];
  const seen = new Set<string>();

  for (const slug of stack.servers) {
    const mcp = bySlug.get(slug);
    if (mcp && isInstallable(mcp) && !seen.has(mcp.slug)) {
      picked.push(mcp);
      seen.add(mcp.slug);
    }
  }

  if (picked.length >= size) return picked.slice(0, Math.max(size, picked.length));

  const topUp = mcps
    .filter((m) => !seen.has(m.slug) && isInstallable(m) && matchesKeyword(m, stack.fallbackKeywords))
    .sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name));

  for (const mcp of topUp) {
    if (picked.length >= size) break;
    picked.push(mcp);
    seen.add(mcp.slug);
  }

  return picked;
}

export function getStack(slug: string) {
  return STACKS.find((s) => s.slug === slug);
}
