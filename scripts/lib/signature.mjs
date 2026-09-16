// Decides whether a refresh is worth deploying.
//
// The pipeline rewrote the catalog every morning and the workflow committed
// whenever any byte differed — which was always, because meta.json carries a
// fresh timestamp and star counts drift constantly. One refresh was literally
// "353 insertions(+), 353 deletions(-)" of reordering. Every one of those
// triggered a full rebuild of ~2,000 pages for no user-visible change.
//
// So we hash only the fields a visitor would actually notice, and let cosmetic
// churn pass without a deploy.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { log } from "./util.mjs";

/**
 * Deploy at least this often regardless, so star counts, health scores and the
 * "what's new" diff cannot go indefinitely stale behind unchanged content.
 */
export const MAX_DAYS_BETWEEN_DEPLOYS = 7;

const DAY = 86_400_000;

/**
 * The projection that decides "did anything meaningful change".
 *
 * Deliberately excluded: stars, forks, openIssues, weeklyDownloads, pushedAt,
 * updatedAt and README bodies. Those move every day, are invisible on a card,
 * and are what made every refresh look like a change. The weekly floor above
 * is what keeps them fresh.
 */
function meaningfulMcp(m) {
  return [
    m.slug,
    m.name,
    m.description,
    m.category,
    m.repository ?? "",
    m.license ?? "",
    m.repoMeta?.archived ? "archived" : "",
    m.packages
      .map((p) => `${p.registryType}:${p.identifier}@${p.version}:${(p.env ?? []).map((e) => e.name).join("|")}`)
      .join(","),
    m.remotes.map((r) => `${r.type}:${r.url}:${(r.headers ?? []).map((h) => h.name).join("|")}`).join(","),
    // Tool names and their parameters are content; descriptions rewrite often
    // enough to be noise on their own but matter when a tool appears or goes.
    (m.tools ?? []).map((t) => `${t.name}(${(t.inputs ?? []).map((i) => i.name).join(",")})`).join(";"),
    // Observed capabilities and publishing signals. The analyzed version is
    // already hashed via packages above, so these only add resolution — a
    // server that starts reaching for child_process is worth publishing.
    // Evidence line numbers are excluded: they shift on any rebuild.
    m.inspection
      ? [
          m.inspection.status,
          m.inspection.capabilities.map((c) => c.id).sort().join(","),
          (m.inspection.installScripts ?? []).join(","),
          m.inspection.trustedPublisher ?? "",
          m.inspection.provenance ? "prov" : "",
          m.inspection.maintainers ?? "",
        ].join("|")
      : "",
    // A transient probe failure cannot erase the list above —
    // preserveEnrichment carries the previous one forward when a run
    // discovers none.
    //
    // `toolsStatus` is deliberately NOT hashed. It records why a probe did
    // or did not return tools, and ~17 of 200 remote servers are unreachable
    // on any given morning depending on the network. Hashing it would flip
    // the signature most days and defeat the whole point of gating.
  ].join("");
}

function meaningfulSkill(s) {
  return [s.slug, s.name, s.description, s.category, s.author, s.source, s.sourceUrl].join("");
}

function meaningfulRepo(r) {
  return [r.slug, r.fullName, r.description, r.category, r.language ?? "", r.license ?? ""].join("");
}

const PROJECTIONS = {
  mcps: meaningfulMcp,
  skills: meaningfulSkill,
  repos: meaningfulRepo,
};

/** Stable hash of everything a visitor would notice. */
export function contentSignature({ skills, mcps, repos }) {
  const hash = createHash("sha256");
  for (const [kind, items] of [
    ["mcps", mcps],
    ["skills", skills],
    ["repos", repos],
  ]) {
    // Sort by slug so registry reordering alone never counts as a change.
    const lines = items.map(PROJECTIONS[kind]).sort();
    hash.update(`${kind}:${lines.length}\n`);
    for (const line of lines) hash.update(`${line}\n`);
  }
  return hash.digest("hex");
}

async function readPrevious(dataDir) {
  try {
    return JSON.parse(await readFile(join(dataDir, "signature.json"), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Compare against the committed signature and decide whether to publish.
 *
 * Must be called on the final, enriched catalogs — the ones about to be
 * written. Signing the raw fetch instead compares a token-less run (no tools,
 * no repo metadata) against a signature taken from an enriched one, so every
 * alternating run looks changed.
 *
 * @returns {Promise<{signature: object, shouldDeploy: boolean, reason: string}>}
 */
export async function evaluateChange(dataDir, catalogs) {
  const signature = contentSignature(catalogs);
  const previous = await readPrevious(dataDir);
  const now = new Date();

  if (!previous?.signature) {
    return {
      signature: { signature, changedAt: now.toISOString(), lastDeployAt: now.toISOString() },
      shouldDeploy: true,
      reason: "no previous signature",
    };
  }

  if (previous.signature !== signature) {
    return {
      signature: { signature, changedAt: now.toISOString(), lastDeployAt: now.toISOString() },
      shouldDeploy: true,
      reason: "catalog content changed",
    };
  }

  const sinceDeploy = (now.getTime() - Date.parse(previous.lastDeployAt ?? previous.changedAt)) / DAY;
  if (!Number.isFinite(sinceDeploy) || sinceDeploy >= MAX_DAYS_BETWEEN_DEPLOYS) {
    return {
      signature: { signature, changedAt: previous.changedAt, lastDeployAt: now.toISOString() },
      shouldDeploy: true,
      reason: `scheduled refresh (${Math.floor(sinceDeploy)}d since last deploy)`,
    };
  }

  return {
    // Carry the previous stamps forward untouched: this run is being discarded.
    signature: previous,
    shouldDeploy: false,
    reason: `no meaningful change (${Math.floor(sinceDeploy)}d since last deploy)`,
  };
}

export function reportDecision({ shouldDeploy, reason }) {
  log(shouldDeploy ? `deploy: YES — ${reason}` : `deploy: NO — ${reason}`);
}
