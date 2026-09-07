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

const REPO_FIELDS = `
  nameWithOwner
  stargazerCount
  forkCount
  isArchived
  isFork
  createdAt
  pushedAt
  licenseInfo { spdxId }
  primaryLanguage { name }
  issues(states: OPEN) { totalCount }
`;

function normalizeRepo(node) {
  return {
    slug: node.nameWithOwner,
    stars: node.stargazerCount ?? null,
    forks: node.forkCount ?? null,
    archived: !!node.isArchived,
    isFork: !!node.isFork,
    createdAt: node.createdAt ?? null,
    pushedAt: node.pushedAt ?? null,
    openIssues: node.issues?.totalCount ?? null,
    license: node.licenseInfo?.spdxId ?? null,
    language: node.primaryLanguage?.name ?? null,
  };
}

/**
 * Resolve repository metadata for a list of "owner/name" slugs.
 * @returns {Promise<Map<string, object>>} slug (lowercased) -> repo meta
 */
export async function resolveRepoMeta(slugs) {
  const out = new Map();
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return out;

  if (!TOKEN) {
    log(`repo meta: skipped for ${unique.length} repos (no GITHUB_TOKEN)`);
    return out;
  }

  for (let i = 0; i < unique.length; i += CHUNK) {
    const batch = unique.slice(i, i + CHUNK);
    const fields = batch
      .map((slug, n) => {
        const [owner, name] = slug.split("/");
        // Aliases must be valid GraphQL names, hence the r0/r1/... indirection.
        return `r${n}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${REPO_FIELDS} }`;
      })
      .join("\n");
    try {
      const data = await graphql(`query { ${fields} }`);
      for (const node of Object.values(data)) {
        if (node?.nameWithOwner) out.set(node.nameWithOwner.toLowerCase(), normalizeRepo(node));
      }
    } catch (err) {
      log(`repo meta: batch ${i / CHUNK + 1} failed — ${err.message}`);
    }
  }

  log(`repo meta: resolved ${out.size}/${unique.length} repos`);
  return out;
}

/**
 * Attach `stars` and a `repo` metadata block to items in place.
 *
 * The metadata is what powers the trust panel: how long the project has
 * existed, when it was last pushed, whether it is archived or a fork. A
 * directory that presents an abandoned server identically to a maintained one
 * is actively unhelpful, since installing either runs code on the user's
 * machine with their credentials.
 */
export async function attachRepoMeta(items, urlOf) {
  const slugs = items.map((it) => repoSlugFromUrl(urlOf(it)));
  const metas = await resolveRepoMeta(slugs);
  items.forEach((it, i) => {
    const slug = slugs[i];
    const meta = slug ? metas.get(slug.toLowerCase()) : null;
    it.stars = meta?.stars ?? null;
    it.repoMeta = meta ?? null;
  });
  return items;
}
