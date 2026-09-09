// Live tool discovery for remote MCP servers.
//
// The registry publishes what a server *is* but not what it *does* — no tool
// names, descriptions or schemas. That is the single biggest thing a developer
// wants before installing, and once tool names are indexed you can answer
// "which server has a create_issue tool?", which no directory does today.
//
// So we speak MCP to each remote server and ask. Scope and limits:
//
//   * Remote servers only. Discovering a stdio server's tools would mean
//     downloading and executing an untrusted package on the build machine.
//     That is never worth it, so packaged servers report no tools.
//   * Roughly half of remote servers require auth and answer 401. That is
//     expected and recorded as "auth required", not as an error.
//   * Everything is best-effort: a slow or broken server must not fail the
//     build, so each probe is independently timed out and swallowed.

import { log } from "./util.mjs";

const CONCURRENCY = 8;
const TIMEOUT_MS = 8000;
const PROTOCOL_VERSION = "2025-06-18";
const MAX_TOOLS = 60;

/** Streamable HTTP may answer as JSON or as an SSE stream. Handle both. */
function parseRpc(body) {
  const trimmed = body.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  // SSE: pull the last `data:` payload that parses as a JSON-RPC envelope.
  for (const chunk of trimmed.split(/\n\n+/).reverse()) {
    const data = chunk
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!data) continue;
    try {
      const parsed = JSON.parse(data);
      if (parsed.jsonrpc || parsed.result || parsed.error) return parsed;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

async function rpc(url, message, sessionId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": PROTOCOL_VERSION,
        "User-Agent": "ai-library-bot/1.0",
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify(message),
    });
    const text = await res.text();
    return {
      status: res.status,
      sessionId: res.headers.get("mcp-session-id") || sessionId,
      body: parseRpc(text),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Trim a schema down to what the UI shows, dropping deep nesting. */
function slimSchema(schema) {
  if (!schema || typeof schema !== "object") return null;
  const props = schema.properties;
  if (!props || typeof props !== "object") return null;

  const required = Array.isArray(schema.required) ? schema.required : [];
  const fields = Object.entries(props)
    .slice(0, 20)
    .map(([name, def]) => ({
      name,
      type: Array.isArray(def?.type) ? def.type.join(" | ") : (def?.type ?? "any"),
      description:
        typeof def?.description === "string" ? def.description.replace(/\s+/g, " ").slice(0, 200) : null,
      required: required.includes(name),
      ...(Array.isArray(def?.enum) ? { enum: def.enum.slice(0, 12).map(String) } : {}),
    }));

  return fields.length ? fields : null;
}

/**
 * Ask one remote server for its tools.
 * @returns {Promise<{status: "ok"|"auth"|"error"|"unsupported", tools: object[]}>}
 */
export async function probeRemote(url) {
  try {
    const init = await rpc(url, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "ai-library", version: "1.0.0" },
      },
    });

    if (init.status === 401 || init.status === 403) return { status: "auth", tools: [] };
    if (!init.body?.result) return { status: "error", tools: [] };
    if (!init.body.result.capabilities?.tools) return { status: "unsupported", tools: [] };

    // The spec requires this notification before normal operation; some
    // servers reject tools/list without it.
    await rpc(url, { jsonrpc: "2.0", method: "notifications/initialized" }, init.sessionId).catch(() => {});

    const listed = await rpc(url, { jsonrpc: "2.0", id: 2, method: "tools/list" }, init.sessionId);
    if (listed.status === 401 || listed.status === 403) return { status: "auth", tools: [] };

    const tools = listed.body?.result?.tools;
    if (!Array.isArray(tools)) return { status: "error", tools: [] };

    return {
      status: "ok",
      tools: tools.slice(0, MAX_TOOLS).map((t) => ({
        name: String(t.name ?? "").slice(0, 120),
        description:
          typeof t.description === "string" ? t.description.replace(/\s+/g, " ").slice(0, 400) : null,
        inputs: slimSchema(t.inputSchema),
      })).filter((t) => t.name),
    };
  } catch {
    return { status: "error", tools: [] };
  }
}

/**
 * Probe every remote server, writing `tools` and `toolsStatus` in place.
 * Set MCP_PROBE=0 to skip (useful for fast local iteration).
 */
export async function attachTools(servers) {
  if (process.env.MCP_PROBE === "0") {
    log("tool discovery: skipped (MCP_PROBE=0)");
    return servers;
  }

  const targets = servers.filter((m) => !m.packages.length && m.remotes[0]?.url);
  const tally = { ok: 0, auth: 0, error: 0, unsupported: 0 };

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (m) => {
        const { status, tools } = await probeRemote(m.remotes[0].url);
        tally[status] = (tally[status] ?? 0) + 1;
        m.toolsStatus = status;
        if (tools.length) m.tools = tools;
      }),
    );
  }

  log(
    `tool discovery: ${tally.ok} answered, ${tally.auth} need auth, ` +
      `${tally.unsupported} expose no tools, ${tally.error} unreachable (of ${targets.length})`,
  );
  return servers;
}
