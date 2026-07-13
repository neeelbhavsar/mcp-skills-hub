// Fetch top GitHub repos useful in AI workflows via the Search API.
// Optional GITHUB_TOKEN lifts rate limits (30 req/min search, 5000/hr core).

import { getJSON, clean, slugify, log, sleep } from "./lib/util.mjs";

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const QUERIES = [
  { q: "topic:mcp stars:>150", category: "MCP & Tooling" },
  { q: "topic:ai-agents stars:>400", category: "AI Agents" },
  { q: "topic:llm stars:>1500", category: "LLM Frameworks" },
  { q: "topic:rag stars:>400", category: "RAG & Retrieval" },
  { q: "topic:prompt-engineering stars:>800", category: "Prompts" },
  { q: "topic:agent language:python stars:>800", category: "AI Agents" },
  { q: "topic:copilot stars:>500", category: "Coding Assistants" },
  { q: "topic:awesome ai stars:>3000", category: "Awesome Lists" },
];

async function searchRepos({ q, category }, perPage = 20) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}`;
  const headers = { Accept: "application/vnd.github+json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  try {
    const data = await getJSON(url, { headers, label: `gh:${q}` });
    return (data.items || []).map((r) => ({
      id: `repo:${slugify(r.full_name)}`,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login,
      slug: slugify(r.full_name),
      description: clean(r.description || `${r.name} on GitHub.`),
      url: r.html_url,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      topics: (r.topics || []).slice(0, 8),
      license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
      category,
      updatedAt: r.pushed_at,
    }));
  } catch (err) {
    log(`repo query failed (${q}): ${err.message}`);
    return [];
  }
}

export async function fetchRepos() {
  const all = [];
  for (const query of QUERIES) {
    const repos = await searchRepos(query);
    all.push(...repos);
    log(`${query.category}: +${repos.length} (${query.q})`);
    await sleep(TOKEN ? 300 : 6500); // respect unauth search limit (10/min)
  }
  // Dedupe by full name, keep the first (highest-star) category assignment.
  const bySlug = new Map();
  for (const r of all) if (!bySlug.has(r.slug)) bySlug.set(r.slug, r);
  const deduped = [...bySlug.values()].sort((a, b) => b.stars - a.stars);
  log(`Repos total after dedupe: ${deduped.length}`);
  return deduped;
}
