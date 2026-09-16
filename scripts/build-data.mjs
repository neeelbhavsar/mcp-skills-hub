// Orchestrator: runs every fetcher, writes normalized JSON into src/data.
// Run manually (`npm run data`) or on a daily GitHub Actions cron.

import { writeFile, mkdir, readFile, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchMCPs } from "./fetch-mcps.mjs";
import { fetchSkills } from "./fetch-skills.mjs";
import { fetchRepos } from "./fetch-repos.mjs";
import { log } from "./lib/util.mjs";
import { diffCatalogs } from "./lib/changes.mjs";
import { evaluateChange, reportDecision } from "./lib/signature.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "data");

function summarize(items, key) {
  const counts = {};
  for (const it of items) counts[it[key]] = (counts[it[key]] || 0) + 1;
  return counts;
}

/**
 * Fields that come from best-effort enrichment rather than the primary
 * registry: a token-less local run, an auth-walled server or a slow README
 * fetch all legitimately produce nothing for them.
 */
const ENRICHED_FIELDS = ["repoMeta", "stars", "tools", "toolsStatus", "readme"];

/** Enrichment that describes a specific repository, not the resource itself. */
const ORIGIN_BOUND_FIELDS = new Set(["repoMeta", "stars", "readme"]);

const isEmpty = (v) =>
  v === null || v === undefined || (Array.isArray(v) && v.length === 0);

/**
 * Carry enriched fields forward from the previous snapshot wherever this run
 * produced nothing.
 *
 * Without this, running `npm run data` locally (no GITHUB_TOKEN) silently
 * erased every star count and maintenance signal that CI had populated — the
 * catalog would look intact while the trust panels quietly emptied out.
 * Absent data now means "not refreshed", not "deleted".
 */
async function preserveEnrichment(name, current) {
  let previous = [];
  try {
    previous = JSON.parse(await readFile(join(DATA_DIR, name), "utf8"));
  } catch {
    return current;
  }
  if (!Array.isArray(previous) || previous.length === 0) return current;

  const before = new Map(previous.map((i) => [i.slug, i]));
  let carried = 0;
  let dropped = 0;

  for (const item of current) {
    const old = before.get(item.slug);
    if (!old) continue;

    // Enrichment is only valid for the source it was derived from. When a
    // resource is re-pointed at a different repository, carrying the previous
    // stars, README or maintenance data forward would attribute one project's
    // numbers to another — which is how 297 skills kept the marketplace
    // repo's 36,397 stars after being correctly re-attributed to their own.
    const originChanged =
      (old.repo ?? old.repository ?? null) !== (item.repo ?? item.repository ?? null) ||
      (old.subdir ?? null) !== (item.subdir ?? null);

    for (const field of ENRICHED_FIELDS) {
      if (originChanged && ORIGIN_BOUND_FIELDS.has(field)) {
        if (!isEmpty(old[field])) dropped++;
        continue;
      }
      if (isEmpty(item[field]) && !isEmpty(old[field])) {
        item[field] = old[field];
        carried++;
      }
    }
  }

  // Belt and braces: repoMeta records the repo it came from, so a mismatch is
  // detectable regardless of snapshot ordering. The comparison above only sees
  // a re-pointing on the run it happens; this catches one already baked in.
  for (const item of current) {
    const claimed = item.repoMeta?.slug;
    const actual = item.repo ?? null;
    if (claimed && actual && claimed.toLowerCase() !== actual.toLowerCase()) {
      item.repoMeta = null;
      item.stars = null;
      dropped++;
    }
  }

  if (dropped) log(`${name}: dropped ${dropped} stale values whose source repo changed`);

  if (carried) log(`${name}: carried ${carried} enriched values forward`);
  return current;
}

/**
 * Never let a broken upstream wipe good data: if a fetch comes back empty but
 * the committed file already holds records, keep the existing ones and fail
 * the run loudly so the breakage is visible instead of silently shipping an
 * empty catalog.
 */
async function keepOrFail(name, items) {
  if (items.length > 0) return items;
  let existing = [];
  try {
    existing = JSON.parse(await readFile(join(DATA_DIR, name), "utf8"));
  } catch {
    return items;
  }
  if (existing.length === 0) return items;
  log(`WARN ${name}: fetch returned 0, keeping ${existing.length} existing records`);
  failed.push(name);
  return existing;
}

const failed = [];

async function writeJSON(name, payload) {
  await writeFile(join(DATA_DIR, name), JSON.stringify(payload, null, 2) + "\n", "utf8");
  log(`wrote ${name}`);
}

async function main() {
  const stamp = process.env.BUILD_STAMP || new Date().toISOString();
  await mkdir(DATA_DIR, { recursive: true });

  const [skills, mcps, repos] = await Promise.all([
    fetchSkills().catch((e) => (log("skills fatal", e.message), [])),
    fetchMCPs().catch((e) => (log("mcps fatal", e.message), [])),
    fetchRepos().catch((e) => (log("repos fatal", e.message), [])),
  ]);

  // These all read the on-disk files, which are still yesterday's snapshot,
  // so they must run before anything is written.
  const changes = await diffCatalogs(DATA_DIR, { skills, mcps, repos });
  await Promise.all([
    preserveEnrichment("skills.json", skills),
    preserveEnrichment("mcps.json", mcps),
    preserveEnrichment("repos.json", repos),
  ]);

  // Signed after enrichment, on exactly what is about to be written. Signing
  // the raw fetch instead compared a token-less run (no tools, no repo data)
  // against a CI run that had both, so every alternating run looked changed.
  const decision = await evaluateChange(DATA_DIR, { skills, mcps, repos });
  reportDecision(decision);

  const skillsOut = await keepOrFail("skills.json", skills);
  const mcpsOut = await keepOrFail("mcps.json", mcps);
  const reposOut = await keepOrFail("repos.json", repos);

  await writeJSON("skills.json", skillsOut);
  await writeJSON("mcps.json", mcpsOut);
  await writeJSON("repos.json", reposOut);
  await writeJSON("meta.json", {
    updatedAt: stamp,
    counts: { skills: skillsOut.length, mcps: mcpsOut.length, repos: reposOut.length },
    categories: {
      skills: summarize(skillsOut, "category"),
      mcps: summarize(mcpsOut, "category"),
      repos: summarize(reposOut, "category"),
    },
    sources: {
      skills: [...new Set(skillsOut.map((s) => s.source))],
      mcps: [...new Set(mcpsOut.map((m) => m.source))],
      repos: ["GitHub Search API"],
    },
  });

  await writeJSON("changes.json", changes);
  await writeJSON("signature.json", decision.signature);

  // Consumed by the workflow to decide whether to commit (and so whether to
  // trigger a deploy). Written as a GitHub Actions output when running in CI.
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `deploy=${decision.shouldDeploy}
`);
  }

  log(
    `DONE — skills:${skillsOut.length} mcps:${mcpsOut.length} repos:${reposOut.length} ` +
      `· deploy:${decision.shouldDeploy ? "yes" : "no"}`,
  );
  if (failed.length) throw new Error(`empty fetch for: ${failed.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
