"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ServerEntry } from "@/lib/ai-targets";

/**
 * Selection state for the setup builder.
 *
 * Setting up a machine previously meant opening each server's page and
 * hand-merging its JSON block into one file. Here the user ticks servers as
 * they browse and gets a single merged config at /setup.
 *
 * The selection is a list of slugs in localStorage; the config bodies come
 * from a server-built index so the browsing pages stay static.
 */

interface CartValue {
  slugs: string[];
  entries: ServerEntry[];
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
const STORAGE_KEY = "ai-library-setup";

export function CartProvider({
  index,
  children,
}: {
  index: ServerEntry[];
  children: React.ReactNode;
}) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

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

  const bySlug = useMemo(() => new Map(index.map((e) => [e.slug, e])), [index]);

  // Read once after mount rather than at render, so the server and the first
  // client render agree.
  const [origin, setOrigin] = useState("");
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setOrigin(window.location.origin), []);

  const value = useMemo<CartValue>(() => {
    const known = new Set(bySlug.keys());
    return {
      // Drop slugs whose server has since left the registry.
      slugs: slugs.filter((s) => known.has(s)),
      entries: slugs.flatMap((s) => {
        const entry = bySlug.get(s);
        return entry ? [entry] : [];
      }),
      has: (slug) => slugs.includes(slug),
      toggle: (slug) => setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
      remove: (slug) => setSlugs((prev) => prev.filter((s) => s !== slug)),
      clear: () => setSlugs([]),
      replace: (next) => setSlugs(next.filter((s) => known.has(s))),
      shareUrl: origin ? `${origin}/setup?servers=${slugs.filter((s) => known.has(s)).join(",")}` : "",
      ready,
    };
  }, [slugs, bySlug, ready, origin]);

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
