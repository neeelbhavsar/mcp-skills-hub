// Batch star-count resolution for anything that points at a GitHub repo.
//
// MCP servers and skills arrive from their registries with no popularity
// signal at all, which left the catalogs' "Popular" sort comparing nulls. We
// backfill it here from the repo each entry already links to.
//
// Uses the GraphQL API so ~250 repos cost 2-3 requests instead of 250. GraphQL
// requires a token, so without one we degrade to "no stars" rather than
// hammering the unauthenticated REST limit (60/hr) and getting the whole run
// rate-limited.

import { log } from "./util.mjs";

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const CHUNK = 100;

/** Pull "owner/name" out of any GitHub URL. Returns null for non-GitHub. */
export function repoSlugFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/github\.com\/([^/#?]+)\/([^/#?]+)/i);
  if (!m) return null;
  const owner = m[1];
  const name = m[2].replace(/\.git$/i, "");
  if (!owner || !name) return null;
  return `${owner}/${name}`;
}

async function graphql(query) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "ai-library-bot/1.0",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const body = await res.json();
  // Missing/renamed repos come back as null nodes alongside errors; that is
  // expected and must not fail the batch.
  if (body.errors && !body.data) throw new Error(body.errors[0]?.message || "GraphQL error");
  return body.data || {};
}

/**
 * Resolve star counts for a list of "owner/name" slugs.
 * @returns {Promise<Map<string, number>>} slug (lowercased) -> stars
 */
export async function resolveStars(slugs) {
  const out = new Map();
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return out;

  if (!TOKEN) {
    log(`stars: skipped for ${unique.length} repos (no GITHUB_TOKEN)`);
    return out;
  }

  for (let i = 0; i < unique.length; i += CHUNK) {
    const batch = unique.slice(i, i + CHUNK);
    const fields = batch
      .map((slug, n) => {
        const [owner, name] = slug.split("/");
        // Aliases must be valid GraphQL names, hence the r0/r1/... indirection.
        return `r${n}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { nameWithOwner stargazerCount }`;
      })
      .join("\n");
    try {
      const data = await graphql(`query { ${fields} }`);
      for (const node of Object.values(data)) {
        if (node?.nameWithOwner) out.set(node.nameWithOwner.toLowerCase(), node.stargazerCount);
      }
    } catch (err) {
      log(`stars: batch ${i / CHUNK + 1} failed — ${err.message}`);
    }
  }

  log(`stars: resolved ${out.size}/${unique.length} repos`);
  return out;
}

/** Attach `stars` to items in place, using a URL field to find the repo. */
export async function attachStars(items, urlOf) {
  const slugs = items.map((it) => repoSlugFromUrl(urlOf(it)));
  const stars = await resolveStars(slugs);
  items.forEach((it, i) => {
    const slug = slugs[i];
    if (slug) it.stars = stars.get(slug.toLowerCase()) ?? null;
  });
  return items;
}
