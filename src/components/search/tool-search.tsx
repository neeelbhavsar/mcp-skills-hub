"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Wrench, X } from "lucide-react";
import type { ToolIndexEntry } from "@/lib/view";
// From utils, not data: importing lib/data here pulled the whole catalog
// into the client bundle.
import { toolHref } from "@/lib/view";
import { useLazyJson } from "@/lib/lazy-json";
import { searchItems } from "@/lib/search";

const PAGE = 40;

/**
 * Search across every discovered tool. Nobody else indexes MCP tool names, so
 * this answers questions the other directories cannot — "which server has a
 * create_issue tool?".
 */
export function ToolSearch({
  initial,
  total: totalTools,
  indexUrl,
}: {
  /** The first page, server-rendered so the list is there without JavaScript. */
  initial: ToolIndexEntry[];
  total: number;
  /** Full index, fetched on first interaction. */
  indexUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [wanted, setWanted] = useState(false);
  const deferred = useDeferredValue(query);
  const { data } = useLazyJson<ToolIndexEntry[]>(indexUrl, wanted || query.length > 0);
  const tools = data ?? initial;

  // Same matcher as the catalogs and ⌘K, with the tool name as the title, so
  // a query ranks and filters identically wherever it is typed.
  const searchable = useMemo(
    () =>
      tools.map((entry) => ({
        entry,
        title: entry.tool,
        category: "",
        description: entry.description ?? "",
        search: entry.server.toLowerCase(),
      })),
    [tools],
  );
  const matched = useMemo(() => searchItems(searchable, deferred)?.map((s) => s.entry) ?? null, [searchable, deferred]);
  const results = (matched ?? tools).slice(0, limit);

  // The full match count, not the page size: this read "40 tools" for any
  // query with more than one page of hits.
  const total = matched ? matched.length : totalTools;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          onFocus={() => setWanted(true)}
          placeholder="create_issue, search, query, screenshot…"
          aria-label="Search tools"
          className="ring-focus h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-10 font-mono text-base text-foreground sm:text-sm placeholder:font-sans placeholder:text-muted-2 focus:border-brand/50"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-4 mb-3 text-sm text-muted" aria-live="polite">
        <span className="font-semibold text-foreground">{total}</span> tool{total === 1 ? "" : "s"}
        {query && <> matching “{deferred}”</>}
      </p>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          No tool matches “{deferred}”.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/60">
          {results.map((entry) => (
            <li key={`${entry.slug}-${entry.tool}`}>
              <Link
                href={toolHref(entry.tool, entry.slug, entry.shared)}
                className="ring-focus flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50"
              >
                <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2" />
                <span className="min-w-0 flex-1">
                  <code className="font-mono text-sm text-brand-2">{entry.tool}</code>
                  {entry.description && (
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted">{entry.description}</span>
                  )}
                </span>
                <span className="shrink-0 truncate text-xs text-muted-2">{entry.server}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > limit && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => {
              setWanted(true);
              setLimit((l) => l + PAGE);
            }}
            className="ring-focus rounded-xl border border-border bg-surface px-6 py-3 text-sm text-foreground transition-colors hover:border-brand/50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
