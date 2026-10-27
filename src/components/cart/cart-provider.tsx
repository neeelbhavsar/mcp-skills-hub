"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ServerEntry } from "@/lib/ai-targets";
import { useLazyJson } from "@/lib/lazy-json";

/**
 * Selection state for the setup builder.
 *
 * Setting up a machine previously meant opening each server's page and
 * hand-merging its JSON block into one file. Here the user ticks servers as
 * they browse and gets a single merged config at /setup.
 *
 * The selection is a list of slugs in localStorage. The config bodies live in
 * a static JSON index that is only fetched when something needs them (the
 * /setup page). It used to be a prop of this provider, which inlined the
 * launch details of every server into the HTML of every page on the site.
 */

interface CartValue {
  slugs: string[];
  /** Selected servers with launch details; empty until the index has loaded. */
  entries: ServerEntry[];
  /** True once the index has arrived and `entries` is meaningful. */
  entriesReady: boolean;
  /** Ask for the index. Idempotent; the setup builder calls it on mount. */
  loadEntries: () => void;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** Replace the whole selection — used by starter packs and shared links. */
  replace: (slugs: string[]) => void;
  /** Absolute, shareable URL encoding the current selection. */
  shareUrl: string;
  /** False until localStorage has been read, so SSR and first paint agree. */
  ready: boolean;
}

const CartContext = createContext<CartValue | null>(null);
// Kept under the old brand name: renaming the key would silently empty every
// returning visitor's saved setup.
const STORAGE_KEY = "ai-library-setup";

export function CartProvider({
  indexUrl,
  children,
}: {
  /** URL of the static setup index (versioned per build). */
  indexUrl: string;
  children: React.ReactNode;
}) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [wantIndex, setWantIndex] = useState(false);
  const { data: index } = useLazyJson<ServerEntry[]>(indexUrl, wantIndex);

  // localStorage is unreadable on the server; the selection can only be
  // restored after mount. Runs once.
  //
  // A `?servers=` parameter wins over stored state, so a shared link always
  // shows the sender's stack rather than the recipient's own selection.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("servers");
    if (shared) {
      setSlugs(shared.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 60));
      setReady(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setSlugs(parsed.filter((s): s is string => typeof s === "string"));
      }
    } catch {
      /* corrupt or unavailable — start empty */
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      /* private mode — selection just won't persist */
    }
  }, [slugs, ready]);

  const bySlug = useMemo(() => new Map((index ?? []).map((e) => [e.slug, e])), [index]);

  // Read once after mount rather than at render, so the server and the first
  // client render agree.
  const [origin, setOrigin] = useState("");
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setOrigin(window.location.origin), []);

  const loadEntries = useCallback(() => setWantIndex(true), []);

  const value = useMemo<CartValue>(() => {
    // Before the index arrives every slug is kept; afterwards, slugs whose
    // server has since left the registry drop out.
    const live = index ? slugs.filter((s) => bySlug.has(s)) : slugs;
    return {
      slugs: live,
      entries: index ? live.map((s) => bySlug.get(s)!) : [],
      entriesReady: !!index,
      loadEntries,
      has: (slug) => slugs.includes(slug),
      toggle: (slug) => setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
      remove: (slug) => setSlugs((prev) => prev.filter((s) => s !== slug)),
      clear: () => setSlugs([]),
      replace: (next) => setSlugs(next),
      shareUrl: origin ? `${origin}/setup?servers=${live.join(",")}` : "",
      ready,
    };
  }, [slugs, bySlug, index, ready, origin, loadEntries]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/** Safe variant for components that may render outside the provider. */
export function useCartOptional() {
  return useContext(CartContext);
}

export function useToggleServer(slug: string) {
  const cart = useCartOptional();
  const selected = cart?.has(slug) ?? false;
  const toggle = useCallback(() => cart?.toggle(slug), [cart, slug]);
  return { selected, toggle, available: !!cart };
}
