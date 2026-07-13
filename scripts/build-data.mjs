// Orchestrator: runs every fetcher, writes normalized JSON into src/data.
// Run manually (`npm run data`) or on a daily GitHub Actions cron.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchMCPs } from "./fetch-mcps.mjs";
import { fetchSkills } from "./fetch-skills.mjs";
import { fetchRepos } from "./fetch-repos.mjs";
import { log } from "./lib/util.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "data");

function summarize(items, key) {
  const counts = {};
  for (const it of items) counts[it[key]] = (counts[it[key]] || 0) + 1;
  return counts;
}

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

  await writeJSON("skills.json", skills);
  await writeJSON("mcps.json", mcps);
  await writeJSON("repos.json", repos);
  await writeJSON("meta.json", {
    updatedAt: stamp,
    counts: { skills: skills.length, mcps: mcps.length, repos: repos.length },
    categories: {
      skills: summarize(skills, "category"),
      mcps: summarize(mcps, "category"),
      repos: summarize(repos, "category"),
    },
    sources: {
      skills: [...new Set(skills.map((s) => s.source))],
      mcps: [...new Set(mcps.map((m) => m.source))],
      repos: ["GitHub Search API"],
    },
  });

  log(`DONE — skills:${skills.length} mcps:${mcps.length} repos:${repos.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
