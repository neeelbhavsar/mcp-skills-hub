#!/usr/bin/env node
// AI Library MCP server — search the directory from inside your assistant.
//
// An MCP server that finds MCP servers. It reads the site's own JSON API, so
// it needs no local data and stays current with the daily refresh.
//
//   claude mcp add ai-library -- node /path/to/mcp-server/index.mjs
//
// Implements the stdio transport directly over JSON-RPC 2.0 so the package has
// zero dependencies — an install-time supply chain of one.

import { createInterface } from "node:readline";

const BASE = process.env.AI_LIBRARY_URL || "https://mcp-skills-hub.vercel.app";
const PROTOCOL_VERSION = "2025-06-18";

const cache = new Map();

async function load(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const res = await fetch(`${BASE}/api/${kind}`, {
    headers: { Accept: "application/json", "User-Agent": "ai-library-mcp/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to load ${kind}: HTTP ${res.status}`);
  const data = await res.json();
  cache.set(kind, data);
  return data;
}

const rows = (data, kind) => data[kind === "mcps" ? "servers" : kind] ?? [];

function score(row, tokens) {
  const hay = `${row.name} ${row.description} ${row.category ?? ""}`.toLowerCase();
  let total = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return 0;
    total += row.name.toLowerCase().includes(t) ? 3 : 1;
  }
  return total;
}

function search(items, query, limit) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items.slice(0, limit);
  return items
    .map((row) => ({ row, s: score(row, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.row.stars ?? 0) - (a.row.stars ?? 0))
    .slice(0, limit)
    .map((x) => x.row);
}

const TOOLS = [
  {
    name: "search_mcp_servers",
    description:
      "Search the AI Library directory for Model Context Protocol servers by keyword or use case. Returns each server's install configuration and trust signals.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords, e.g. 'postgres' or 'browser automation'." },
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "search_skills",
    description: "Search the AI Library directory for Agent Skills by keyword or use case.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords, e.g. 'pdf' or 'spreadsheet'." },
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "search_tools",
    description:
      "Search MCP servers by the tools they expose, e.g. 'create_issue' or 'screenshot'. Returns the tool, its input schema and which server provides it. Use this when you know the capability you want but not the server.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tool name or capability, e.g. 'search_docs'." },
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_install_config",
    description:
      "Get the ready-to-paste install configuration for one MCP server, by its AI Library slug.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Server slug, from search_mcp_servers." },
      },
      required: ["slug"],
    },
  },
];

async function callTool(name, args = {}) {
  const limit = Math.min(Number(args.limit) || 10, 50);

  if (name === "search_mcp_servers") {
    const data = await load("mcps");
    return search(rows(data, "mcps"), String(args.query ?? ""), limit);
  }

  if (name === "search_skills") {
    const data = await load("skills");
    return search(rows(data, "skills"), String(args.query ?? ""), limit);
  }

  if (name === "search_tools") {
    const data = await load("mcps");
    const q = String(args.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const flat = [];
    for (const server of rows(data, "mcps")) {
      for (const tool of server.tools ?? []) {
        const hay = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
        if (q.every((t) => hay.includes(t))) {
          flat.push({
            tool: tool.name,
            description: tool.description,
            inputs: tool.inputs,
            server: server.name,
            slug: server.slug,
            url: server.url,
            launch: server.launch,
          });
        }
      }
    }
    // Exact and prefix matches first — "search" should surface `search_docs`
    // ahead of a tool that merely mentions searching.
    flat.sort((a, b) => {
      const rank = (n) => (n.toLowerCase() === q.join("_") ? 0 : n.toLowerCase().startsWith(q[0] ?? "") ? 1 : 2);
      return rank(a.tool) - rank(b.tool) || a.tool.localeCompare(b.tool);
    });
    return flat.slice(0, limit);
  }

  if (name === "get_install_config") {
    const data = await load("mcps");
    const server = rows(data, "mcps").find((s) => s.slug === args.slug);
    if (!server) throw new Error(`No server with slug "${args.slug}"`);
    return server;
  }

  throw new Error(`Unknown tool: ${name}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(msg) {
  const { id, method, params } = msg;

  // Notifications carry no id and must not be answered.
  if (id === undefined) return;

  try {
    if (method === "initialize") {
      return send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "ai-library", version: "1.0.0" },
        },
      });
    }

    if (method === "tools/list") {
      return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    }

    if (method === "tools/call") {
      const result = await callTool(params?.name, params?.arguments);
      return send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    }

    if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });

    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    send({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message } });
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
  handle(msg);
});
