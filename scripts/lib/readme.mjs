// Fetch each project's README so the detail page can render real
// documentation instead of a one-line registry description.
//
// Kept deliberately small: this is a rendered excerpt, not a mirror. The full
// document stays one click away on GitHub, and 700 full READMEs committed to
// git would bloat the repo for little benefit.

import { log, sleep } from "./util.mjs";
import { extractTools } from "./readme-tools.mjs";

const CONCURRENCY = 8;
// Every page module imports the whole catalog, so README bytes are multiplied
// across 1,200 static pages and 11 build workers. At 12k this OOM'd the build
// once skills gained their own docs (skills.json 309KB -> 2.2MB). 6k is still
// ~900 words of unique text per page, against the ~185 we had before.
const MAX_CHARS = 6_000;
const BRANCHES = ["main", "master"];
const NAMES = ["README.md", "readme.md", "Readme.md", "SKILL.md"];

/** @returns {Promise<string | null | undefined>} text; null on an HTTP error; undefined when unreachable */
async function tryFetch(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "mcp-skills-hub-bot/1.0", ...headers },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GitHub's "README for a directory" endpoint. Only a fallback for when
 * raw.githubusercontent.com is unreachable (it resets connections under load):
 * the API's unauthenticated rate limit is far lower.
 */
function readmeViaApi(slug, subdir) {
  const token = process.env.GITHUB_TOKEN;
  const path = subdir ? `/${subdir.replace(/^\/+|\/+$/g, "")}` : "";
  return tryFetch(`https://api.github.com/repos/${slug}/readme${path}`, {
    Accept: "application/vnd.github.raw",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
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

function toResult(md, slug, subdir, branch = "HEAD") {
  const tidied = tidy(md);
  const dir = subdir ? subdir.replace(/^\/+|\/+$/g, "") : "";
  return {
    readme: {
      markdown: tidied.length > MAX_CHARS ? `${tidied.slice(0, MAX_CHARS)}\n\n…` : tidied,
      truncated: tidied.length > MAX_CHARS,
      url: dir ? `https://github.com/${slug}/tree/${branch}/${dir}#readme` : `https://github.com/${slug}#readme`,
    },
    // Parsed from the full document, before truncation: tool tables are often
    // further down than the excerpt reaches.
    tools: extractTools(tidied),
  };
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
  let unreachable = false;
  for (const branch of BRANCHES) {
    for (const name of NAMES) {
      const md = await tryFetch(`https://raw.githubusercontent.com/${slug}/${branch}/${prefix}${name}`);
      if (md === undefined) unreachable = true;
      if (md && md.trim()) return toResult(md, slug, subdir, branch);
    }
  }
  if (unreachable) {
    const md = await readmeViaApi(slug, subdir);
    if (md && md.trim()) return toResult(md, slug, subdir);
  }
  return null;
}

/**
 * Attach a `readme` block to items that resolve to a GitHub repo.
 * `subdirOf` is optional and scopes the lookup to one folder.
 *
 * With `extractTools`, items that have no live-probed tool list get one parsed
 * from the README, marked `toolsSource: "readme"` so the UI can say so. Live
 * probing only reaches remote servers that need no credentials, which left
 * every packaged server showing no tools at all.
 */
export async function attachReadmes(items, slugOf, subdirOf = () => null, { extractTools: parseTools = false } = {}) {
  if (process.env.SKIP_READMES === "1") {
    log("readmes: skipped (SKIP_READMES=1)");
    return items;
  }

  const targets = items.filter((it) => slugOf(it));
  let found = 0;
  let parsed = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (it) => {
        const result = await readmeFor(slugOf(it), subdirOf(it));
        if (!result) return;
        it.readme = result.readme;
        found++;
        if (parseTools && !it.tools?.length && result.tools.length) {
          it.tools = result.tools;
          it.toolsSource = "readme";
          parsed++;
        }
      }),
    );
    if (i + CONCURRENCY < targets.length) await sleep(80);
  }

  log(`readmes: ${found}/${targets.length} fetched${parseTools ? `, tools parsed for ${parsed}` : ""}`);
  return items;
}
