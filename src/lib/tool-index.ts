/**
 * Which tool pages are worth putting in front of a crawler.
 *
 * A single-provider tool with a one-word, non-namespaced name — `get`, `fetch`,
 * `summary`, `vote` — restates one row of its server's page and cannot
 * plausibly rank for anything. Twelve such pages is not a lot, but on a new
 * domain that Google is already rationing crawl budget on, every URL in the
 * sitemap competes with one that could actually earn a visit.
 *
 * Namespaced names (`betterpost_humanize`, `certscore_scan_site`) and anything
 * exposed by more than one server stay indexable: those are real long-tail
 * targets and the multi-provider ones answer a comparison question no other
 * page on the site answers.
 *
 * The pages themselves keep working and stay linked — this only governs
 * indexing.
 */
export function isIndexableTool(name: string, providerCount: number): boolean {
  if (providerCount > 1) return true;
  const generic = !name.includes("_") && !name.includes("-") && name.length <= 12;
  return !generic;
}
