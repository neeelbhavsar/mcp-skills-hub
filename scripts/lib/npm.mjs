// npm registry lookups for the supply-chain panel.
//
// Both endpoints are public and unauthenticated:
//   registry.npmjs.org/<pkg>          — metadata, incl. repository + publish times
//   api.npmjs.org/downloads/point/... — download counts
//
// Download volume and publish recency are the cheapest useful signal for
// "is this package real and maintained", and comparing the package's declared
// repository against the one the registry entry links to is a cheap
// typosquat/impersonation check.

import { getJSON, log, sleep } from "./util.mjs";
import { repoSlugFromUrl } from "./github.mjs";

const CONCURRENCY = 6;

async function fetchOne(name) {
  const encoded = encodeURIComponent(name).replace(/^%40/, "@");
  const [meta, downloads] = await Promise.all([
    getJSON(`https://registry.npmjs.org/${encoded}`, { label: `npm:${name}`, retries: 2 }).catch(() => null),
    getJSON(`https://api.npmjs.org/downloads/point/last-week/${encoded}`, {
      label: `npm-dl:${name}`,
      retries: 2,
    }).catch(() => null),
  ]);
  if (!meta) return null;

  const latest = meta["dist-tags"]?.latest;
  const times = meta.time || {};
  const repoUrl = meta.repository?.url || meta.repository || null;

  return {
    name,
    version: latest ?? null,
    weeklyDownloads: downloads?.downloads ?? null,
    firstPublished: times.created ?? null,
    lastPublished: latest ? (times[latest] ?? times.modified ?? null) : (times.modified ?? null),
    deprecated: !!meta.versions?.[latest]?.deprecated,
    // The repo the *package itself* claims, which we compare against the repo
    // the registry entry advertises.
    declaredRepo: repoSlugFromUrl(typeof repoUrl === "string" ? repoUrl : repoUrl?.url),
  };
}

/** Look up npm metadata for a set of package names. */
export async function resolveNpmPackages(names) {
  const out = new Map();
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return out;

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((n) => fetchOne(n).catch(() => null)));
    results.forEach((r, n) => {
      if (r) out.set(batch[n], r);
    });
    // The npm registry is generous but not unlimited; stay polite.
    if (i + CONCURRENCY < unique.length) await sleep(120);
  }

  log(`npm: resolved ${out.size}/${unique.length} packages`);
  return out;
}
