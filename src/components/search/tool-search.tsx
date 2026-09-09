"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Wrench, X } from "lucide-react";
import type { ToolIndexEntry } from "@/lib/view";
import { toolSlug } from "@/lib/data";
import { tokenize } from "@/lib/search";

const PAGE = 40;

/**
 * Search across every discovered tool. Nobody else indexes MCP tool names, so
 * this answers questions the other directories cannot — "which server has a
 * create_issue tool?".
 */
export function ToolSearch({ tools }: { tools: ToolIndexEntry[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const deferred = useDeferredValue(query);

  const results = useMemo(() => {
    const tokens = tokenize(deferred);
    if (tokens.length === 0) return tools.slice(0, limit);

    return tools
      .map((entry) => {
        const name = entry.tool.toLowerCase();
        const body = `${entry.description ?? ""} ${entry.server}`.toLowerCase();
        let score = 0;
        for (const t of tokens) {
          if (name.startsWith(t)) score += 8;
          else if (name.includes(t)) score += 5;
          else if (body.includes(t)) score += 1;
          else return null;
        }
        return { entry, score };
      })
      .filter((x): x is { entry: ToolIndexEntry; score: number } => x !== null)
      .sort((a, b) => b.score - a.score || a.entry.tool.localeCompare(b.entry.tool))
      .slice(0, limit)
      .map((x) => x.entry);
  }, [tools, deferred, limit]);

  const total = tokenize(deferred).length === 0 ? tools.length : results.length;

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
          placeholder="create_issue, search, query, screenshot…"
          aria-label="Search tools"
          className="ring-focus h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-10 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-muted-2 focus:border-brand/50"
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
                href={`/tools/${toolSlug(entry.tool)}`}
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

      {results.length >= limit && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setLimit((l) => l + PAGE)}
            className="ring-focus rounded-xl border border-border bg-surface px-6 py-3 text-sm text-foreground transition-colors hover:border-brand/50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
