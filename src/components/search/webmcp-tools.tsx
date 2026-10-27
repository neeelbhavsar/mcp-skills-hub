"use client";

import { useEffect } from "react";
import type { PaletteItem } from "@/lib/view";
import { searchItems } from "@/lib/search";
import { loadJson } from "@/lib/lazy-json";
import { absoluteUrl, resourcePath } from "@/lib/seo";

/**
 * WebMCP: lets an agent driving the browser call the site's search directly
 * instead of scraping the page. The API is a W3C community-group draft
 * (`navigator.modelContext`), so this is feature-detected and inert in every
 * browser that doesn't expose it — no polyfill, no cost.
 */
interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

interface ModelContext {
  registerTool?: (tool: ModelContextTool) => unknown;
}

export function WebMcpTools({ indexUrl }: { indexUrl: string }) {
  useEffect(() => {
    const ctx = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!ctx?.registerTool) return;

    ctx.registerTool({
      name: "search_catalog",
      description:
        "Search the MCP Skills Hub directory of MCP servers, Agent Skills, GitHub repos and MCP tools. Returns matching entries with their page URL; each page has install steps for every AI client.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords, e.g. 'postgres' or 'create_issue'." },
          limit: { type: "number", description: "Maximum results (default 10)." },
        },
        required: ["query"],
      },
      async execute(input) {
        const items = await loadJson<PaletteItem[]>(indexUrl);
        const limit = Math.min(Number(input.limit) || 10, 50);
        const results = (searchItems(items, String(input.query ?? "")) ?? []).slice(0, limit);
        return results.map((r) => ({
          title: r.title,
          kind: r.kind,
          description: r.description,
          url: absoluteUrl(resourcePath(r.kind, r.slug)),
        }));
      },
    });
  }, [indexUrl]);

  return null;
}
