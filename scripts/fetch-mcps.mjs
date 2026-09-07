// Fetch MCP servers from the official MCP Registry + Glama, normalize, dedupe.
// Docs verified: registry.modelcontextprotocol.io/v0/servers (public, no auth),
// glama.ai/api/mcp/v1/servers (now requires a bearer token; set GLAMA_API_KEY
// to enable it — without the key that source is skipped, not fatal).

import { getJSON, slugify, clean, categorize, log, sleep } from "./lib/util.mjs";
import { attachStars } from "./lib/github.mjs";

const MCP_CATEGORIES = [
  { name: "Databases & Storage", keys: ["postgres", "mysql", "sqlite", "database", "mongodb", "redis", "supabase", "duckdb", "s3", "storage", "sql", "bigquery", "snowflake"] },
  { name: "Dev Tools & Git", keys: ["github", "gitlab", "git ", "docker", "kubernetes", "ci/cd", "jira", "sentry", "terminal", "shell", "code", "compiler", "npm", "linter"] },
  { name: "Web & Search", keys: ["search", "browser", "puppeteer", "playwright", "scrape", "crawl", "fetch", "web", "google", "brave", "perplexity", "tavily"] },
  { name: "Productivity", keys: ["notion", "slack", "linear", "calendar", "gmail", "email", "todo", "task", "asana", "trello", "obsidian", "confluence"] },
  { name: "AI & Memory", keys: ["memory", "vector", "embedding", "rag", "knowledge", "llm", "openai", "anthropic", "agent", "reasoning"] },
  { name: "Cloud & DevOps", keys: ["aws", "azure", "gcp", "cloud", "vercel", "netlify", "cloudflare", "deploy", "infrastructure", "monitoring"] },
  { name: "Finance & Data", keys: ["stripe", "payment", "finance", "crypto", "stock", "market", "analytics", "csv", "excel", "spreadsheet"] },
  { name: "Design & Media", keys: ["figma", "image", "video", "audio", "design", "canva", "screenshot", "pdf", "media"] },
  // The registry's long tail is mostly vertical/business servers. Without
  // these buckets ~30% of the catalog collapsed into "Other".
  { name: "Docs & Knowledge", keys: ["documentation", "docs", "markdown", "wiki", "note", "knowledge base", "content", "article", "blog", "readme", "reference"] },
  { name: "Marketing & Social", keys: ["marketing", "seo", "campaign", "brand", "linkedin", "twitter", "social media", "ads", "advertis", "audience", "newsletter", "outreach"] },
  { name: "Commerce & Retail", keys: ["shopify", "ecommerce", "e-commerce", "product catalog", "pricing", "checkout", "order", "inventory", "storefront", "retail", "booking"] },
  { name: "Health & Science", keys: ["health", "medical", "clinical", "clinician", "patient", "biology", "genomic", "chemistry", "research paper", "pubmed", "scientific"] },
  { name: "Legal & Government", keys: ["legal", "compliance", "regulation", "government", "federal", "tax", "contract", "policy", "court", "law"] },
];

const catOf = (text) => categorize(text, MCP_CATEGORIES);

/** Official MCP Registry — clean JSON, install/package metadata. */
async function fromOfficialRegistry(max = 220) {
  const out = [];
  let cursor = "";
  try {
    while (out.length < max) {
      const url = `https://registry.modelcontextprotocol.io/v0/servers?limit=100${cursor ? `&cursor=${cursor}` : ""}`;
      const data = await getJSON(url, { label: "mcp-registry" });
      const servers = data.servers || [];
      for (const entry of servers) {
        // Registry responses wrap each record as { server, _meta }; older
        // payloads were flat. Support both.
        const s = entry.server || entry;
        const meta = entry._meta?.["io.modelcontextprotocol.registry/official"] || s._meta || {};
        if (meta.status && meta.status !== "active") continue;
        if (meta.isLatest === false) continue;
        const shortName = (s.name || "").split("/").pop() || s.name;
        const desc = clean(s.description || "");
        out.push({
          id: `mcp:${slugify(s.name)}`,
          name: s.title || shortName,
          qualifiedName: s.name,
          slug: slugify(s.name),
          description: desc,
          category: catOf(`${s.name} ${desc}`),
          repository: s.repository?.url || null,
          homepage: s.websiteUrl || s.repository?.url || null,
          packages: (s.packages || []).map((p) => ({
            registryType: p.registryType || p.registry_type || null,
            identifier: p.identifier,
            version: p.version || "latest",
            transport: p.transport?.type || p.transport || "stdio",
          })),
          remotes: (s.remotes || []).map((r) => ({ type: r.type, url: r.url })),
          stars: null,
          source: "MCP Registry",
          updatedAt: meta.publishedAt || meta.published_at || null,
        });
      }
      cursor = data.metadata?.nextCursor || data.metadata?.next_cursor || "";
      if (!cursor || servers.length === 0) break;
      await sleep(250);
    }
    log(`official registry: ${out.length} servers`);
  } catch (err) {
    log(`official registry failed: ${err.message}`);
  }
  return out;
}

/** Glama registry — adds tools/attributes/license enrichment. */
function glamaHeaders() {
  const key = process.env.GLAMA_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function fromGlama(max = 180) {
  if (!process.env.GLAMA_API_KEY) {
    log("glama: skipped (no GLAMA_API_KEY)");
    return [];
  }
  const out = [];
  let cursor = null;
  try {
    while (out.length < max) {
      const url = `https://glama.ai/api/mcp/v1/servers?first=100${cursor ? `&after=${cursor}` : ""}`;
      const data = await getJSON(url, { label: "glama", headers: glamaHeaders() });
      const servers = data.servers || [];
      for (const s of servers) {
        const desc = clean(s.description || "");
        const name = s.name || s.slug;
        out.push({
          id: `mcp:${slugify(s.slug || name)}`,
          name,
          qualifiedName: s.slug || slugify(name),
          slug: slugify(s.slug || name),
          description: desc,
          category: catOf(`${name} ${desc}`),
          repository: s.repository?.url || s.url || null,
          homepage: s.url || s.repository?.url || null,
          packages: [],
          remotes: [],
          tools: (s.tools || []).slice(0, 12).map((t) => t.name).filter(Boolean),
          license: s.spdxLicense?.name || null,
          stars: null,
          source: "Glama",
          updatedAt: null,
        });
      }
      cursor = data.pageInfo?.endCursor;
      if (!cursor || !data.pageInfo?.hasNextPage || servers.length === 0) break;
      await sleep(250);
    }
    log(`glama: ${out.length} servers`);
  } catch (err) {
    log(`glama failed: ${err.message}`);
  }
  return out;
}

export async function fetchMCPs() {
  const [official, glama] = await Promise.all([fromOfficialRegistry(), fromGlama()]);
  // Dedupe by slug, preferring the official registry (has install metadata).
  const bySlug = new Map();
  for (const item of [...official, ...glama]) {
    const key = item.slug;
    if (!bySlug.has(key)) bySlug.set(key, item);
    else {
      const existing = bySlug.get(key);
      // Merge: keep official install data, borrow glama tools/license.
      bySlug.set(key, {
        ...existing,
        tools: existing.tools || item.tools,
        license: existing.license || item.license,
        description: existing.description || item.description,
      });
    }
  }
  const all = [...bySlug.values()].filter((m) => m.name && m.description);
  // Registries carry no popularity signal; backfill from the linked repo so
  // the catalog's "Popular" sort has something real to order by.
  await attachStars(all, (m) => m.repository || m.homepage);
  log(`MCPs total after dedupe: ${all.length}`);
  return all;
}
