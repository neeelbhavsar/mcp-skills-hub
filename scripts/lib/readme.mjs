// Fetch each project's README so the detail page can render real
// documentation instead of a one-line registry description.
//
// Kept deliberately small: this is a rendered excerpt, not a mirror. The full
// document stays one click away on GitHub, and 700 full READMEs committed to
// git would bloat the repo for little benefit.

import { log, sleep } from "./util.mjs";

const CONCURRENCY = 8;
// Every page module imports the whole catalog, so README bytes are multiplied
// across 1,200 static pages and 11 build workers. At 12k this OOM'd the build
// once skills gained their own docs (skills.json 309KB -> 2.2MB). 6k is still
// ~900 words of unique text per page, against the ~185 we had before.
const MAX_CHARS = 6_000;
const BRANCHES = ["main", "master"];
const NAMES = ["README.md", "readme.md", "Readme.md", "SKILL.md"];

async function tryFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ai-library-bot/1.0" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strip what does not survive a markdown excerpt: badge rows, HTML blocks,
 * anchors and comment noise. Leaves headings, prose, lists and code fences.
 */
function tidy(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    // Badge-only lines (shields.io etc.) carry no information here.
    .replace(/^[ \t]*(\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)[ \t]*)+$/gm, "")
    .replace(/^[ \t]*(!\[[^\]]*\]\([^)]*\)[ \t]*)+$/gm, "")
    .replace(/<\/?(div|p|br|img|h[1-6]|center|table|tr|td|th|tbody|thead|a|span|picture|source)\b[^>]*>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * @param {string} slug   owner/name
 * @param {string|null} subdir  folder within the repo, when the resource is one
 *   plugin inside a larger monorepo. Without this every plugin in a shared
 *   marketplace repo would get the same root README — which is worse than none,
 *   since it makes hundreds of pages genuine duplicates of each other.
 */
async function readmeFor(slug, subdir) {
  const prefix = subdir ? `${subdir.replace(/^\/+|\/+$/g, "")}/` : "";
  for (const branch of BRANCHES) {
    for (const name of NAMES) {
      const md = await tryFetch(`https://raw.githubusercontent.com/${slug}/${branch}/${prefix}${name}`);
      if (md && md.trim()) {
        const tidied = tidy(md);
        return {
          markdown: tidied.length > MAX_CHARS ? `${tidied.slice(0, MAX_CHARS)}\n\n…` : tidied,
          truncated: tidied.length > MAX_CHARS,
          url: `https://github.com/${slug}#readme`,
        };
      }
    }
  }
  return null;
}

/**
 * Attach a `readme` block to items that resolve to a GitHub repo.
 * `subdirOf` is optional and scopes the lookup to one folder.
 */
export async function attachReadmes(items, slugOf, subdirOf = () => null) {
  if (process.env.SKIP_READMES === "1") {
    log("readmes: skipped (SKIP_READMES=1)");
    return items;
  }

  const targets = items.filter((it) => slugOf(it));
  let found = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (it) => {
        const readme = await readmeFor(slugOf(it), subdirOf(it));
        if (readme) {
          it.readme = readme;
          found++;
        }
      }),
    );
    if (i + CONCURRENCY < targets.length) await sleep(80);
  }

  log(`readmes: ${found}/${targets.length} fetched`);
  return items;
}
