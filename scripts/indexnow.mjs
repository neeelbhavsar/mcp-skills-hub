// Tell IndexNow-aware search engines (Bing, Yandex, Seznam, Naver…) which
// URLs changed in today's refresh, instead of waiting for them to recrawl.
//
//   node scripts/indexnow.mjs
//
// Run by the daily workflow after a data commit. The key is public by design:
// it is served at /<key>.txt so the engine can verify the submitter owns the
// host. Google does not use IndexNow; it relies on the sitemap.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { log } from "./lib/util.mjs";

const KEY = "6be81ec7cc2ec67903b3137b31b8c5e0";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://mcp-skills-hub.vercel.app").replace(/\/+$/, "");
const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
const PATHS = { mcps: "/mcps", skills: "/skills", repos: "/repos" };

const changes = JSON.parse(await readFile(join(DATA, "changes.json"), "utf8"));

// Pages that change with every refresh, plus every entry that was added or
// changed state. Removed entries are left out: they now 404, which engines
// discover on their own.
const urls = new Set(["/", "/mcps", "/skills", "/repos", "/whats-new", "/best-mcp-servers", "/tools"].map((p) => SITE + p));
for (const [kind, diff] of Object.entries(changes.kinds ?? {})) {
  for (const bucket of ["added", "deprecated", "revived", "movers"]) {
    for (const entry of diff?.[bucket] ?? []) urls.add(`${SITE}${PATHS[kind]}/${entry.slug}`);
  }
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(SITE).host,
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList: [...urls].slice(0, 10_000),
  }),
});

// 200 and 202 are both success; 403/422 mean the key file is not live yet.
log(`indexnow: submitted ${urls.size} urls — HTTP ${res.status}`);
if (res.status >= 400) process.exitCode = 1;
