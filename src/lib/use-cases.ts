import { mcps, skills } from "./data";
import type { Mcp, Skill } from "./types";

/**
 * Task-oriented entry points.
 *
 * Categories are how the data is shaped; they are not how people search.
 * Nobody types "AI & Memory" — they type "MCP server for Postgres". These
 * pages answer the question the way it is actually asked, and are the one
 * place on the site with human editorial judgement rather than generated
 * output.
 *
 * Matching is by keyword against the registry text, so the pages stay correct
 * as the daily refresh adds and removes servers.
 */
export interface UseCase {
  slug: string;
  title: string;
  question: string;
  intro: string;
  /** Matched case-insensitively against the name and description. */
  keywords: string[];
  /** Practical advice that a generated list cannot supply. */
  guidance: string[];
  /**
   * Honest caveat shown when the catalog's coverage of this task is thin.
   * Better than presenting one weak match as if it were the answer.
   */
  coverageNote?: string;
}

export const USE_CASES: UseCase[] = [
  {
    slug: "query-a-database",
    title: "Query a database from your AI",
    question: "Which MCP server lets my assistant read my database?",
    intro:
      "Give your assistant read (or write) access to Postgres, MySQL, SQLite, MongoDB and friends, so it can answer questions about real data instead of guessing at your schema.",
    keywords: ["postgres", "mysql", "sqlite", "database", "mongodb", "redis", "supabase", "sql", "bigquery", "snowflake", "duckdb"],
    guidance: [
      "Connect with a read-only role first. An assistant that can DROP TABLE eventually will.",
      "Point it at a staging copy before production — schema exploration is chatty and can be slow on a live database.",
      "Prefer servers that let you pass the connection string as an environment variable rather than baking it into the config file you commit.",
    ],
    coverageNote:
      "The public MCP Registry currently lists almost no database servers, and the official Postgres, SQLite and Redis reference servers were archived by the MCP steering group — so there is no maintained first-party option today. Most people use a vendor's own server (Supabase, Neon, PlanetScale) or run a community one from GitHub. This page will fill in as entries are published.",
  },
  {
    slug: "browse-the-web",
    title: "Let your AI browse the web",
    question: "How do I give my assistant web search or a real browser?",
    intro:
      "Search APIs return text; headless browsers can click, scroll and screenshot. Which you want depends on whether you are gathering facts or driving a UI.",
    keywords: ["search", "browser", "puppeteer", "playwright", "scrape", "crawl", "fetch", "web", "brave", "perplexity", "tavily"],
    guidance: [
      "For research, a search API is faster and far cheaper in tokens than driving a browser.",
      "For anything behind a login or heavy on JavaScript, you need a real browser server.",
      "Browser servers can reach your local network. Run them in a container if that matters to you.",
    ],
  },
  {
    slug: "work-with-github",
    title: "Work with GitHub and git",
    question: "Which MCP server connects my assistant to GitHub?",
    intro:
      "Read issues and pull requests, review diffs, and open PRs without leaving the conversation.",
    keywords: ["github", "gitlab", "git", "pull request", "issue", "repository", "commit"],
    guidance: [
      "Scope the token as tightly as the work needs. A read-only token covers most review workflows.",
      "Prefer the official GitHub MCP server over community forks — it tracks API changes fastest.",
      "Watch your context budget: a large diff can fill the window on its own.",
    ],
    coverageNote:
      "The registry has thin GitHub coverage. GitHub's own MCP server is published separately at github/github-mcp-server rather than through the registry, and is usually the one you want for issues and pull requests. The reference Git server below covers local repositories.",
  },
  {
    slug: "read-and-write-files",
    title: "Read and write local files",
    question: "How does my assistant get access to my filesystem?",
    intro:
      "Filesystem servers let the assistant open, edit and organise files outside the editor's own workspace.",
    keywords: ["filesystem", "file", "directory", "folder", "document", "pdf", "markdown"],
    guidance: [
      "Every filesystem server should be scoped to a directory. If it can't be, don't run it.",
      "These are stdio servers — they execute locally with your user's permissions.",
      "Your coding assistant probably already reads the open workspace; you only need this for files outside it.",
    ],
  },
  {
    slug: "connect-your-notes",
    title: "Connect your notes and docs",
    question: "Can my assistant read my Notion, Obsidian or Confluence?",
    intro:
      "Pull your team's written context — specs, runbooks, meeting notes — into the assistant so answers reflect how your organisation actually works.",
    keywords: ["notion", "obsidian", "confluence", "note", "wiki", "documentation", "knowledge", "docs"],
    guidance: [
      "Hosted note tools mean a remote server: your document contents leave your machine.",
      "Start with a single space or vault rather than granting workspace-wide access.",
      "Check whether the server supports search — without it the assistant fetches whole documents and burns context.",
    ],
  },
  {
    slug: "monitor-and-deploy",
    title: "Monitor and deploy from chat",
    question: "Which servers connect to my cloud and observability tools?",
    intro:
      "Read logs, inspect infrastructure and trigger deploys across AWS, Cloudflare, Vercel, Sentry and similar.",
    keywords: ["aws", "azure", "gcp", "cloud", "vercel", "netlify", "cloudflare", "deploy", "sentry", "monitoring", "kubernetes", "docker"],
    guidance: [
      "Read-only credentials cover incident triage, which is most of the value here.",
      "Deploy-capable servers should require an explicit confirmation step. Check before wiring one up.",
      "Log servers can return enormous payloads — prefer ones that support filtering server-side.",
    ],
  },
];

export interface UseCaseMatches {
  useCase: UseCase;
  mcps: Mcp[];
  skills: Skill[];
}

/**
 * Relevance, not a boolean. A plain `.some(includes)` filter followed by a
 * star sort put whatever happened to be alphabetically first at the top —
 * "1325.AI" outranking the official Filesystem server on "read and write
 * files". A keyword in the *name* is much stronger evidence than one buried
 * in a description.
 */
function relevance(name: string, body: string, keywords: string[]): number {
  const n = name.toLowerCase();
  const b = body.toLowerCase();
  let score = 0;
  for (const raw of keywords) {
    const k = raw.toLowerCase();
    if (n.includes(k)) score += 6;
    else if (b.includes(k)) score += 1;
  }
  return score;
}

function rank<T extends { name: string; stars: number | null; source?: string }>(
  items: T[],
  body: (item: T) => string,
  keywords: string[],
  limit: number,
): T[] {
  return items
    .map((item) => ({ item, score: relevance(item.name, body(item), keywords) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        // Canonical implementations win ties over community entries.
        Number(b.item.source === "Official reference") - Number(a.item.source === "Official reference") ||
        (b.item.stars ?? -1) - (a.item.stars ?? -1) ||
        a.item.name.localeCompare(b.item.name),
    )
    .reduce<{ item: T; score: number }[]>((acc, x) => {
      // Some publishers register the same product twice under one name.
      if (!acc.some((seen) => seen.item.name === x.item.name)) acc.push(x);
      return acc;
    }, [])
    .slice(0, limit)
    .map((x) => x.item);
}

export function resolveUseCase(useCase: UseCase): UseCaseMatches {
  const matchedMcps = rank(
    mcps,
    // Deliberately not the category: it is derived by the same keyword
    // matching, so including it made "File Storage" (category "Databases &
    // Storage") a hit for "query a database".
    (m) => `${m.description} ${m.qualifiedName}`,
    useCase.keywords,
    12,
  );
  const matchedSkills = rank(skills, (s) => s.description, useCase.keywords, 6);
  return { useCase, mcps: matchedMcps, skills: matchedSkills };
}

export function getUseCase(slug: string) {
  return USE_CASES.find((u) => u.slug === slug);
}
