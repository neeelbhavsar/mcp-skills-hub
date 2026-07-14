"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CardItem } from "@/lib/view";
import { ResourceCard } from "./resource-card";
import { cn } from "@/lib/utils";

type SortKey = "popular" | "az";
const PAGE = 24;

export function CatalogShell({
  items,
  categories,
}: {
  items: CardItem[];
  categories: { name: string; count: number }[];
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("popular");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((i) => {
      if (cat && i.category !== cat) return false;
      if (q && !i.search.includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      return (b.stars ?? -1) - (a.stars ?? -1);
    });
    return list;
  }, [items, query, cat, sort]);

  const visible = filtered.slice(0, limit);

  function reset() {
    setQuery("");
    setCat(null);
    setLimit(PAGE);
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
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search by name, use-case, keyword…"
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
            <SlidersHorizontal className="h-4 w-4 text-muted-2" />
            <div className="flex rounded-xl border border-border bg-surface p-1">
              {(["popular", "az"] as SortKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "ring-focus rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    sort === s ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {s === "popular" ? "Popular" : "A–Z"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* category chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={!cat} onClick={() => setCat(null)}>
            All <span className="text-muted-2">{items.length}</span>
          </Chip>
          {categories.map((c) => (
            <Chip key={c.name} active={cat === c.name} onClick={() => setCat(cat === c.name ? null : c.name)}>
              {c.name} <span className="text-muted-2">{c.count}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* results */}
      <p className="mb-4 text-sm text-muted">
        <span className="font-semibold text-foreground">{filtered.length}</span> result
        {filtered.length === 1 ? "" : "s"}
        {cat && <> in <span className="text-brand">{cat}</span></>}
        {query && <> for “{query}”</>}
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
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "ring-focus rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-transparent brand-gradient text-white shadow-md shadow-brand/25"
          : "border-border bg-surface text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
