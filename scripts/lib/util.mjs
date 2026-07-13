// Shared helpers for the data-fetch pipeline.
// Uses only Node built-ins (global fetch on Node 18+). No external deps so it
// runs cleanly inside a GitHub Actions cron job.

const UA = "ai-library-bot/1.0 (+https://github.com/ai-library)";

/** Fetch JSON with retries, a polite UA, and optional headers. */
export async function getJSON(url, { headers = {}, retries = 3, label = url } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json", ...headers },
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${label}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

/** Fetch raw text (for README / markdown sources). */
export async function getText(url, { headers = {}, retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Make a URL-safe slug. */
export function slugify(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Trim a description to a clean length, collapsing whitespace. */
export function clean(text = "", max = 320) {
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/**
 * Lightweight keyword categorizer shared by every source so cards across
 * different origins land in consistent buckets.
 */
export function categorize(text = "", buckets) {
  const hay = text.toLowerCase();
  for (const { name, keys } of buckets) {
    if (keys.some((k) => hay.includes(k))) return name;
  }
  return "Other";
}

export const log = (...args) => console.log("[data]", ...args);
