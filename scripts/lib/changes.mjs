// Diff today's catalog against the previously committed one.
//
// The pipeline already rewrites the data every morning, so the previous
// snapshot is sitting in git — computing what changed costs one file read and
// turns a one-time visit into a reason to come back.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { log } from "./util.mjs";

const MAX_PER_BUCKET = 40;
/** Ignore trivial star drift so the movers list stays meaningful. */
const MIN_STAR_DELTA = 5;
const MIN_STAR_PCT = 0.05;

async function readPrevious(dir, name) {
  try {
    const raw = await readFile(join(dir, name), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarize(item) {
  return {
    slug: item.slug,
    name: item.name,
    description: item.description,
    category: item.category,
  };
}

/**
 * @returns {Promise<object>} added / removed / deprecated / revived / movers
 */
export async function diffCatalogs(dataDir, next) {
  const changes = { generatedAt: new Date().toISOString(), kinds: {} };

  for (const [name, current] of Object.entries(next)) {
    const previous = await readPrevious(dataDir, `${name}.json`);

    // A first run has no baseline; reporting all 700 entries as "new" would be
    // noise, so the diff stays empty until there is something to compare to.
    if (previous.length === 0) {
      changes.kinds[name] = { added: [], removed: [], deprecated: [], revived: [], movers: [], baseline: false };
      continue;
    }

    const before = new Map(previous.map((i) => [i.slug, i]));
    const after = new Map(current.map((i) => [i.slug, i]));

    const added = current.filter((i) => !before.has(i.slug)).map(summarize);
    const removed = previous.filter((i) => !after.has(i.slug)).map(summarize);

    const deprecated = [];
    const revived = [];
    const movers = [];

    for (const item of current) {
      const old = before.get(item.slug);
      if (!old) continue;

      const wasArchived = !!old.repoMeta?.archived;
      const isArchived = !!item.repoMeta?.archived;
      if (!wasArchived && isArchived) deprecated.push(summarize(item));
      if (wasArchived && !isArchived) revived.push(summarize(item));

      // Star velocity, but only where both snapshots actually have a number:
      // a null-to-value transition is the token arriving, not growth.
      if (typeof old.stars === "number" && typeof item.stars === "number") {
        const delta = item.stars - old.stars;
        const base = Math.max(old.stars, 1);
        if (Math.abs(delta) >= MIN_STAR_DELTA && Math.abs(delta) / base >= MIN_STAR_PCT) {
          movers.push({ ...summarize(item), delta, stars: item.stars });
        }
      }
    }

    movers.sort((a, b) => b.delta - a.delta);

    changes.kinds[name] = {
      baseline: true,
      added: added.slice(0, MAX_PER_BUCKET),
      removed: removed.slice(0, MAX_PER_BUCKET),
      deprecated: deprecated.slice(0, MAX_PER_BUCKET),
      revived: revived.slice(0, MAX_PER_BUCKET),
      movers: movers.slice(0, MAX_PER_BUCKET),
      counts: {
        added: added.length,
        removed: removed.length,
        deprecated: deprecated.length,
        revived: revived.length,
        previousTotal: previous.length,
        currentTotal: current.length,
      },
    };
  }

  const totals = Object.values(changes.kinds).reduce(
    (acc, k) => acc + k.added.length + k.removed.length + k.deprecated.length,
    0,
  );
  log(`changes: ${totals} notable diffs vs previous snapshot`);
  return changes;
}
