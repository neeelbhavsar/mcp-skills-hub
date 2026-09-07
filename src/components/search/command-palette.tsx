"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Blocks, GitFork, Search, Wand2, CornerDownLeft } from "lucide-react";
import type { PaletteItem } from "@/lib/view";
import type { ResourceKind } from "@/lib/types";
import { searchItems } from "@/lib/search";
import { resourcePath } from "@/lib/seo";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<ResourceKind, typeof Wand2> = {
  skills: Wand2,
  mcps: Blocks,
  repos: GitFork,
};

const KIND_LABEL: Record<ResourceKind, string> = {
  skills: "Skill",
  mcps: "MCP",
  repos: "Repo",
};

const MAX = 8;

/**
 * Cross-catalog ⌘K search. The three catalogs were previously searchable only
 * in isolation, so finding anything meant guessing which of them it lived in.
 */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (searchItems(items, query) ?? []).slice(0, MAX), [items, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Focus after the entry animation starts, or the caret lands nowhere.
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Reset the query when reopening, and the highlight whenever either changes.
  // Adjusted during render (React's recommended pattern) instead of in an
  // effect, so the list never paints with a stale selection.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQuery("");
    setCursor(0);
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setCursor(0);
  }

  // Lock the page behind the modal so the backdrop doesn't scroll.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      router.push(resourcePath(item.kind, item.slug));
    },
    [router],
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search everything"
        className="ring-focus flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-2 transition-colors hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 p-4 pt-[12vh] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Search all resources"
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-2" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKey}
                  placeholder="Search skills, MCP servers and repos…"
                  aria-label="Search all resources"
                  className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-2"
                />
              </div>

              <div className="max-h-[52vh] overflow-y-auto p-2">
                {query.trim() === "" ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-2">
                    Type to search {items.length.toLocaleString()} resources.
                  </p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-2">
                    No matches for “{query}”.
                  </p>
                ) : (
                  <ul role="listbox" aria-label="Results">
                    {results.map((item, i) => {
                      const Icon = KIND_ICON[item.kind];
                      return (
                        <li key={item.id}>
                          <button
                            role="option"
                            aria-selected={i === cursor}
                            onMouseEnter={() => setCursor(i)}
                            onClick={() => go(item)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              i === cursor ? "bg-surface-2" : "hover:bg-surface-2/60",
                            )}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-brand-2">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm capitalize text-foreground">
                                {item.title}
                              </span>
                              <span className="block truncate text-xs text-muted-2">
                                {item.description}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-2">
                              {KIND_LABEL[item.kind]}
                            </span>
                            {i === cursor && (
                              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-2" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
