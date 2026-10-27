/**
 * Which tool pages are worth putting in front of a crawler.
 *
 * Only tools exposed by more than one server. Those answer a comparison
 * question no other page on the site answers ("which servers have a
 * `create_issue` tool, and how do they differ?").
 *
 * A single-provider tool page restates one row of its server's page — the
 * audit measured ~87–260 words, almost all of it shared with that page — and
 * those pages were 55% of the sitemap. The server page already lists the tool
 * by name, so the long-tail query still has an indexable answer; the tool
 * page just stops competing with it for crawl budget.
 *
 * The pages themselves keep working and stay linked (`noindex, follow`) —
 * this only governs indexing and the sitemap, which both call this function
 * so they cannot drift apart.
 */
export function isIndexableTool(_name: string, providerCount: number): boolean {
  return providerCount > 1;
}
