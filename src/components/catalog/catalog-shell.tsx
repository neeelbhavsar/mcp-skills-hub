"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogCard } from "@/lib/view";
import type { ResourceKind } from "@/lib/types";
import { KIND_META, categoryPath, pagePath, CATALOG_PAGE_SIZE } from "@/lib/seo";
import { AI_TARGETS } from "@/lib/ai-targets";
import { searchItems } from "@/lib/search";
import { ResourceCard } from "./resource-card";
import { cn } from "@/lib/utils";
import { useLazyJson } from "@/lib/lazy-json";

const SORTS = [
  { key: "popular", label: "Popular" },
  { key: "recent", label: "Recent" },
  { key: "az", label: "A–Z" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];
const PAGE = CATALOG_PAGE_SIZE;

/**
 * Chip rows swipe horizontally on phones (a wrapped row of 15+ categories is
 * several screens tall there) and wrap from sm up. The negative margin lets
 * the strip bleed to the screen edge so it reads as scrollable.
 */
const CHIP_ROW =
  "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 " +
  // A fade at the cut edge on phones, so the row reads as scrollable.
  "[mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]";

function isSort(v: string | null): v is SortKey {
  return !!v && SORTS.some((s) => s.key === v);
}

export function CatalogShell({
  kind,
  pageItems,
  scopeCount,
  allUrl,
  categories,
  activeCategory = null,
  totalCount,
  page = 1,
}: {
  kind: ResourceKind;
  /**
   * Just this page's cards, server-rendered. The rest of the scope is fetched
   * from `allUrl` on the first search, filter, sort or "Load more" — shipping
   * every card inline made the catalog pages ~500 KB of HTML.
   */
  pageItems: CatalogCard[];
  /** How many cards are in scope (the catalog, or one category). */
  scopeCount: number;
  /** Static JSON with every card in this catalog. */
  allUrl: string;
  categories: { name: string; count: number }[];
  /** Set by the /category/[category] routes; null on the bare catalog page. */
  activeCategory?: string | null;
  /** Size of the whole catalog, for the "All" chip on category pages. */
  totalCount: number;
  /** 1-based page from the /page/[n] routes. */
  page?: number;
}) {
  const router = useRouter();

  // Deliberately NOT `useSearchParams`: that hook opts the whole subtree out of
  // static rendering, which left every catalog and category page shipping a
  // skeleton as its SSR HTML with no content for crawlers. Reading the query
  // string from `location` on mount keeps the grid server-rendered while still
  // honouring a deep link.
  const basePath = KIND_META[kind].path;
  const cat = activeCategory;
  // Where pagination links point: the catalog itself, or this category.
  const scopePath = cat ? categoryPath(kind, cat) : basePath;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [client, setClient] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [wanted, setWanted] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim().length > 0;
  // The default view is the one the /page/[n] routes slice, so a crawler and
  // a visitor landing on page 3 see the same 24 cards. Any filter starts over.
  const browsing = !searching && !client && sort === "popular";
  const { data: all } = useLazyJson<CatalogCard[]>(allUrl, wanted || !browsing || limit > PAGE);

  // Genuine external-state sync: the URL is only readable after hydration, and
  // reading it during render would desync from the server-rendered HTML. This
  // runs once, so there is no cascading-render risk the rule guards against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q");
    const s = sp.get("sort");
    const c = sp.get("client");
    if (q) setQuery(q);
    if (isSort(s)) setSort(s);
    if (c && AI_TARGETS.some((t) => t.id === c)) setClient(c);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset pagination when the result set changes, adjusting state during
  // render rather than in an effect so there is no extra render pass.
  const resetKey = `${cat ?? ""}|${deferredQuery}|${sort}|${client ?? ""}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setLimit(PAGE);
  }

  // `history.replaceState` rather than a router navigation: the URL should stay
  // shareable, but re-running the route for a keystroke would be wasteful and
  // would fight the input's local state.
  const syncUrl = useCallback((next: { q: string; sort: SortKey; client: string | null }) => {
    const sp = new URLSearchParams(window.location.search);
    if (next.q) sp.set("q", next.q);
    else sp.delete("q");
    if (next.sort !== "popular") sp.set("sort", next.sort);
    else sp.delete("sort");
    if (next.client) sp.set("client", next.client);
    else sp.delete("client");
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => syncUrl({ q: deferredQuery, sort, client }), 350);
    return () => clearTimeout(id);
  }, [deferredQuery, sort, client, syncUrl]);

  const sortable = useMemo(
    () => ({
      popular: (a: CatalogCard, b: CatalogCard) => (b.stars ?? -1) - (a.stars ?? -1),
      recent: (a: CatalogCard, b: CatalogCard) =>
        (b.updatedAt ? Date.parse(b.updatedAt) : 0) - (a.updatedAt ? Date.parse(a.updatedAt) : 0),
      az: (a: CatalogCard, b: CatalogCard) => a.title.localeCompare(b.title),
    }),
    [],
  );

  // Every card in scope, once the full catalog has arrived.
  const scoped = useMemo(() => (all ? (cat ? all.filter((c) => c.category === cat) : all) : null), [all, cat]);

  const filtered = useMemo(() => {
    // Until the full set arrives, work with this page's cards.
    let pool = scoped ?? pageItems;
    // "Runs natively in X": stdio servers run anywhere, remote ones need a
    // bridge on the stdio-only clients.
    if (client) {
      const stdioOnly = client === "claude-desktop" || client === "codex";
      pool = pool.filter((i) =>
        i.launchMode === "stdio" ? true : i.launchMode === "remote" ? !stdioOnly : false,
      );
    }
    // A ranked search supplies its own ordering; the sort control only applies
    // when there is no query to rank against.
    const ranked = searchItems(pool, deferredQuery);
    if (ranked) return ranked;
    return [...pool].sort(sortable[sort]);
  }, [scoped, pageItems, client, deferredQuery, sort, sortable]);

  const loading = !scoped && !browsing;
  // Before the full set is loaded, the server-rendered page stands in for it:
  // its cards are already this page's slice, so there is no offset to apply.
  const total = scoped ? filtered.length : browsing ? scopeCount : filtered.length;
  const pageCount = Math.max(1, Math.ceil((scoped ? filtered.length : scopeCount) / PAGE));
  const currentPage = browsing ? Math.min(page, pageCount) : 1;
  const start = (currentPage - 1) * PAGE;
  const visible = scoped ? filtered.slice(start, start + limit) : filtered.slice(0, limit);
  const shownTo = start + visible.length;
  const nextPage = Math.floor(shownTo / PAGE) + 1;

  function reset() {
    setQuery("");
    setClient(null);
    if (cat) router.push(basePath);
  }

  return (
    <div>
      {/* controls — only sticky on large screens; on phones and tablets the
          stacked filters would cover most of the viewport while scrolling. */}
      {/* Only the search row sticks: with the chip rows the sticky bar was
          190px, a third of a laptop viewport. */}
      <div className="-mx-4 bg-background/70 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:sticky lg:top-16 lg:z-30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setWanted(true)}
              placeholder="Search by name, use-case, keyword…"
              aria-label="Search"
              className="ring-focus h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-11 text-base text-foreground sm:text-sm placeholder:text-muted focus:border-brand/50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-2 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-2" aria-hidden />
            <div
              role="radiogroup"
              aria-label="Sort order"
              className={cn(
                "flex rounded-xl border border-border bg-surface p-1 transition-opacity",
                searching && "opacity-50",
              )}
            >
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  role="radio"
                  aria-checked={sort === s.key}
                  disabled={searching}
                  title={searching ? "Sorted by relevance while searching" : undefined}
                  onClick={() => setSort(s.key)}
                  className={cn(
                    "ring-focus min-h-11 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                    sort === s.key ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        {/* client compatibility — MCP-only, since it is derived from transport */}
        {kind === "mcps" && (
          <div className={cn("mt-3 items-center", CHIP_ROW)}>
            <span className="shrink-0 text-xs text-muted">Runs natively in</span>
            <Chip active={!client} onClick={() => setClient(null)}>
              Any client
            </Chip>
            {AI_TARGETS.map((t) => (
              <Chip
                key={t.id}
                active={client === t.id}
                onClick={() => setClient(client === t.id ? null : t.id)}
              >
                {t.name}
              </Chip>
            ))}
          </div>
        )}

        {/* category chips */}
        <div className={cn("mt-3", CHIP_ROW)}>
          <Chip active={!cat} href={basePath}>
            All <span className="opacity-70">{totalCount}</span>
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.name}
              active={cat === c.name}
              href={cat === c.name ? basePath : categoryPath(kind, c.name)}
            >
              {c.name} <span className="opacity-70">{c.count}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* results — the cards are h3s, so the list needs an h2 above them */}
      <h2 className="sr-only">{cat ? `${cat} ${KIND_META[kind].label.toLowerCase()}` : `All ${KIND_META[kind].label.toLowerCase()}`}</h2>
      <p className="mb-4 text-sm text-muted" aria-live="polite">
        <span className="font-semibold text-foreground">{total}</span> result
        {total === 1 ? "" : "s"}
        {cat && <> in <span className="text-brand">{cat}</span></>}
        {searching && <> for “{deferredQuery}”</>}
        {loading && <span className="text-muted"> · loading the full catalog…</span>}
        {browsing && pageCount > 1 && (
          <span className="text-muted">
            {" "}
            · showing {start + 1}–{shownTo}
          </span>
        )}
      </p>

      {filtered.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-sm text-muted">No matches found.</p>
          <button onClick={reset} className="mt-3 min-h-11 px-3 text-sm text-brand hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        // No entrance animation: cards used to start at opacity 0, which left
        // the first painted frame empty below the filters.
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id}>
              <ResourceCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {shownTo < total && (
        <div className="mt-10 flex justify-center">
          {/*
            A real link to the next page, so crawlers can reach every entry;
            with JavaScript it expands in place instead of navigating.
          */}
          <Link
            href={browsing ? pagePath(scopePath, nextPage) : "#"}
            onClick={(e) => {
              e.preventDefault();
              setWanted(true);
              setLimit((l) => l + PAGE);
            }}
            className="ring-focus rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-brand/50"
          >
            Load {Math.min(PAGE, total - shownTo)} more
          </Link>
        </div>
      )}

      {browsing && pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5 text-sm">
          {currentPage > 1 && (
            <Link
              href={pagePath(scopePath, currentPage - 1)}
              className="ring-focus inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Link>
          )}
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={pagePath(scopePath, n)}
              aria-current={n === currentPage ? "page" : undefined}
              className={cn(
                "ring-focus inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2",
                n === currentPage
                  ? "border-brand/50 bg-brand/10 text-foreground"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {n}
            </Link>
          ))}
          {currentPage < pageCount && (
            <Link
              href={pagePath(scopePath, currentPage + 1)}
              className="ring-focus inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-muted hover:text-foreground"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  href,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  /** Categories navigate (they are real routes); other filters are local state. */
  href?: string;
  onClick?: () => void;
}) {
  const className = cn(
    "ring-focus inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-all",
    active
      ? "border-transparent brand-gradient text-white shadow-md shadow-brand/25"
      : "border-border bg-surface text-muted hover:text-foreground",
  );

  if (!href) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}
