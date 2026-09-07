"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CardItem } from "@/lib/view";
import type { ResourceKind } from "@/lib/types";
import { KIND_META, categoryPath } from "@/lib/seo";
import { searchItems } from "@/lib/search";
import { ResourceCard } from "./resource-card";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "popular", label: "Popular" },
  { key: "recent", label: "Recent" },
  { key: "az", label: "A–Z" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];
const PAGE = 24;

function isSort(v: string | null): v is SortKey {
  return !!v && SORTS.some((s) => s.key === v);
}

export function CatalogShell({
  kind,
  items,
  categories,
  activeCategory = null,
}: {
  kind: ResourceKind;
  items: CardItem[];
  categories: { name: string; count: number }[];
  /** Set by the /category/[category] routes; null on the bare catalog page. */
  activeCategory?: string | null;
}) {
  const router = useRouter();

  // Deliberately NOT `useSearchParams`: that hook opts the whole subtree out of
  // static rendering, which left every catalog and category page shipping a
  // skeleton as its SSR HTML with no content for crawlers. Reading the query
  // string from `location` on mount keeps the grid server-rendered while still
  // honouring a deep link.
  const basePath = KIND_META[kind].path;
  const cat = activeCategory;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [limit, setLimit] = useState(PAGE);
  const deferredQuery = useDeferredValue(query);

  // Genuine external-state sync: the URL is only readable after hydration, and
  // reading it during render would desync from the server-rendered HTML. This
  // runs once, so there is no cascading-render risk the rule guards against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q");
    const s = sp.get("sort");
    if (q) setQuery(q);
    if (isSort(s)) setSort(s);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset pagination when the result set changes, adjusting state during
  // render rather than in an effect so there is no extra render pass.
  const resetKey = `${cat ?? ""}|${deferredQuery}|${sort}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setLimit(PAGE);
  }

  // `history.replaceState` rather than a router navigation: the URL should stay
  // shareable, but re-running the route for a keystroke would be wasteful and
  // would fight the input's local state.
  const syncUrl = useCallback((next: { q: string; sort: SortKey }) => {
    const sp = new URLSearchParams(window.location.search);
    if (next.q) sp.set("q", next.q);
    else sp.delete("q");
    if (next.sort !== "popular") sp.set("sort", next.sort);
    else sp.delete("sort");
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => syncUrl({ q: deferredQuery, sort }), 350);
    return () => clearTimeout(id);
  }, [deferredQuery, sort, syncUrl]);

  const sortable = useMemo(
    () => ({
      popular: (a: CardItem, b: CardItem) => (b.stars ?? -1) - (a.stars ?? -1),
      recent: (a: CardItem, b: CardItem) =>
        (b.updatedAt ? Date.parse(b.updatedAt) : 0) - (a.updatedAt ? Date.parse(a.updatedAt) : 0),
      az: (a: CardItem, b: CardItem) => a.title.localeCompare(b.title),
    }),
    [],
  );

  const filtered = useMemo(() => {
    const pool = cat ? items.filter((i) => i.category === cat) : items;
    // A ranked search supplies its own ordering; the sort control only applies
    // when there is no query to rank against.
    const ranked = searchItems(pool, deferredQuery);
    if (ranked) return ranked;
    return [...pool].sort(sortable[sort]);
  }, [items, cat, deferredQuery, sort, sortable]);

  const visible = filtered.slice(0, limit);
  const searching = deferredQuery.trim().length > 0;

  function reset() {
    setQuery("");
    if (cat) router.push(basePath);
  }

  return (
    <div>
      {/* controls */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 bg-background/70 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, use-case, keyword…"
              aria-label="Search"
              className="ring-focus h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-10 text-sm text-foreground placeholder:text-muted-2 focus:border-brand/50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-foreground"
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
                    "ring-focus rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                    sort === s.key ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* category chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={!cat} href={basePath}>
            All <span className="text-muted-2">{items.length}</span>
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.name}
              active={cat === c.name}
              href={cat === c.name ? basePath : categoryPath(kind, c.name)}
            >
              {c.name} <span className="text-muted-2">{c.count}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* results */}
      <p className="mb-4 text-sm text-muted" aria-live="polite">
        <span className="font-semibold text-foreground">{filtered.length}</span> result
        {filtered.length === 1 ? "" : "s"}
        {cat && <> in <span className="text-brand">{cat}</span></>}
        {searching && <> for “{deferredQuery}”</>}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-sm text-muted">No matches found.</p>
          <button onClick={reset} className="mt-3 text-sm text-brand hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i, 11) * 0.03, ease: [0.16, 1, 0.3, 1] }}
            >
              <ResourceCard item={item} />
            </motion.div>
          ))}
        </div>
      )}

      {limit < filtered.length && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setLimit((l) => l + PAGE)}
            className="ring-focus rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-brand/50"
          >
            Load {Math.min(PAGE, filtered.length - limit)} more
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  href,
}: {
  children: React.ReactNode;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "ring-focus rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-transparent brand-gradient text-white shadow-md shadow-brand/25"
          : "border-border bg-surface text-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
