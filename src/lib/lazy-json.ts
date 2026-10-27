"use client";

import { useEffect, useState } from "react";

/**
 * Fetch a JSON file once per page load and share it between every caller.
 * Used for the search and setup indexes, which are too large to inline into
 * every page but small enough to load on demand.
 */
const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(url: string): Promise<T> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      return r.json();
    });
    // A failed request shouldn't poison the cache for the next attempt.
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p as Promise<T>;
}

/** `data` stays null until `enabled` turns true and the file arrives. */
export function useLazyJson<T>(url: string, enabled: boolean): { data: T | null; error: boolean } {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadJson<T>(url).then(
      (data) => live && setState({ data, error: false }),
      () => live && setState((s) => ({ ...s, error: true })),
    );
    return () => {
      live = false;
    };
  }, [url, enabled]);
  return state;
}
