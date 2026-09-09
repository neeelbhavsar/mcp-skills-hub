import type { Mcp, Skill, Repo } from "./types";
import { launchFor, type Launch } from "./compat";

export interface AiTarget {
  id: string;
  name: string;
  color: string; // brand-ish accent for the tab
  blurb: string;
}

/** The AI assistants we generate usage instructions for. */
export const AI_TARGETS: AiTarget[] = [
  { id: "claude-code", name: "Claude Code", color: "#d97757", blurb: "Anthropic's agentic CLI" },
  { id: "claude-desktop", name: "Claude Desktop", color: "#d97757", blurb: "Desktop app (MCP config)" },
  { id: "cursor", name: "Cursor", color: "#8b95ad", blurb: "AI-first code editor" },
  { id: "codex", name: "Codex CLI", color: "#10a37f", blurb: "OpenAI coding agent" },
  { id: "windsurf", name: "Windsurf", color: "#22d3ee", blurb: "Codeium's agentic IDE" },
  { id: "cline", name: "Cline", color: "#7c6bff", blurb: "VS Code autonomous agent" },
  { id: "vscode", name: "VS Code", color: "#3b82f6", blurb: "Copilot / MCP support" },
];

export interface UsageStep {
  label: string;
  code?: string;
  language?: string;
  note?: string;
}

/* ------------------------------------------------------------------ *
 * MCP install/usage generation
 * ------------------------------------------------------------------ */

// Registry names are reverse-DNS, e.g. "io.github.owner/weather" or
// "ac.inference.sh/mcp". The last segment is usually the good name, but a lot
// of publishers just call it "mcp" / "server", which makes a useless (and
// collision-prone) config key. In that case fall back to the namespace.
const GENERIC_KEYS = new Set(["mcp", "server", "mcp-server", "mcpserver", "main", "app", "api"]);
const NAMESPACE_NOISE = new Set([
  "io", "com", "net", "org", "dev", "ai", "app", "sh", "co", "ac", "me", "xyz",
  "github", "gitlab", "cloud", "www",
]);

/** Short, config-key-safe, human-meaningful name for the server. */
function keyFor(mcp: Mcp) {
  const safe = (v: string) => v.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  const [namespace = "", ...rest] = mcp.qualifiedName.split("/");
  const last = rest.pop() || "";

  if (last && !GENERIC_KEYS.has(last.toLowerCase())) return safe(last);

  // Pick the most distinctive token out of the reverse-DNS namespace.
  const token = namespace
    .split(".")
    .filter((t) => t && !NAMESPACE_NOISE.has(t.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];

  return safe(token || last || mcp.slug) || mcp.slug;
}

/** Bridge a remote server through mcp-remote for stdio-only clients. */
function remoteBridge(url: string) {
  return { command: "npx", args: ["-y", "mcp-remote", url] };
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

export function mcpUsage(mcp: Mcp, aiId: string): UsageStep[] {
  const key = keyFor(mcp);
  const resolved = launchFor(mcp);
  // `tools` holds objects now, so joining it directly yields "[object Object]".
  const toolHint = mcp.tools?.length
    ? ` (e.g. ${mcp.tools.slice(0, 3).map((t) => t.name).join(", ")})`
    : "";

  // A handful of registry entries ship neither a package nor an endpoint.
  // Saying so is more useful than emitting a config with a placeholder in it.
  if (resolved.mode === "unknown") {
    return [
      {
        label: "No installation available",
        note: "This registry entry publishes neither a package nor a remote endpoint, so there is nothing to install yet. Check the source repository for manual setup instructions.",
      },
    ];
  }

  const launch: Exclude<Launch, { mode: "unknown" }> = resolved;
  const remote = launch.mode === "remote";

  switch (aiId) {
    case "claude-code": {
      // `--transport` is required for remote servers; without it the CLI tries
      // to execute the URL as a local binary.
      const cmd = remote
        ? `claude mcp add --transport ${launch.transport} ${key} ${launch.url}`
        : `claude mcp add ${key} -- ${launch.command} ${launch.args.join(" ")}`;
      return [
        { label: "Add the server", language: "bash", code: cmd },
        { label: "Verify it's connected", language: "bash", code: "claude mcp list" },
        {
          label: "Use it in a session",
          note: `Ask Claude to use the tools this server exposes${toolHint}. It discovers them automatically.`,
        },
      ];
    }

    case "claude-desktop": {
      // Claude Desktop speaks stdio only — remote servers go through mcp-remote.
      const body = remote ? remoteBridge(launch.url) : { command: launch.command, args: launch.args };
      return [
        {
          label: "Open your MCP config",
          note: "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json · Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
        },
        { label: "Add this server", language: "json", code: json({ mcpServers: { [key]: body } }) },
        ...(remote
          ? [{
              label: "Why the wrapper?",
              note: "This is a remote (HTTP) server and Claude Desktop only launches local processes, so mcp-remote proxies the connection. It will open a browser window if the server needs OAuth.",
            }]
          : []),
        { label: "Restart Claude Desktop", note: "The tools appear under the 🔌 menu once the app reloads." },
      ];
    }

    case "cursor": {
      const body = remote ? { url: launch.url } : { command: launch.command, args: launch.args };
      return [
        {
          label: "Create / edit .cursor/mcp.json in your project",
          language: "json",
          code: json({ mcpServers: { [key]: body } }),
        },
        {
          label: "Enable it",
          note: "Cursor Settings → MCP → toggle the server on. Tools become available to the Composer/Agent.",
        },
      ];
    }

    case "windsurf": {
      // Windsurf keys remote servers as `serverUrl`, not `url`.
      const body = remote ? { serverUrl: launch.url } : { command: launch.command, args: launch.args };
      return [
        {
          label: "Edit ~/.codeium/windsurf/mcp_config.json",
          language: "json",
          code: json({ mcpServers: { [key]: body } }),
        },
        { label: "Reload", note: "Windsurf → Cascade → refresh MCP servers. Cascade can now call the tools." },
      ];
    }

    case "cline": {
      const body = remote
        ? { type: launch.transport === "sse" ? "sse" : "streamableHttp", url: launch.url }
        : { command: launch.command, args: launch.args };
      return [
        { label: "Open Cline → MCP Servers → Configure", note: "Adds to cline_mcp_settings.json." },
        { label: "Add the server", language: "json", code: json({ mcpServers: { [key]: body } }) },
      ];
    }

    case "vscode": {
      // .vscode/mcp.json requires an explicit `type` discriminator.
      const body = remote
        ? { type: launch.transport, url: launch.url }
        : { type: "stdio", command: launch.command, args: launch.args };
      return [
        { label: "Create .vscode/mcp.json", language: "json", code: json({ servers: { [key]: body } }) },
        {
          label: "Start it",
          note: "VS Code shows a ▶ Start action above the server entry. Agent mode (Copilot Chat) can then use the tools.",
        },
      ];
    }

    case "codex": {
      // Codex launches stdio processes only, so remote servers are bridged.
      const bridged = remote ? remoteBridge(launch.url) : { command: launch.command, args: launch.args };
      const toml = `[mcp_servers.${key}]\ncommand = "${bridged.command}"\nargs = [${bridged.args
        .map((a) => `"${a}"`)
        .join(", ")}]`;
      return [
        { label: "Add to ~/.codex/config.toml", language: "toml", code: toml },
        ...(remote
          ? [{ label: "Why the wrapper?", note: "Codex runs MCP servers as local processes, so mcp-remote bridges this HTTP endpoint to stdio." }]
          : []),
        { label: "Run Codex", note: "Codex loads MCP servers from config.toml on startup and exposes their tools to the agent." },
      ];
    }

    default: {
      const body = remote ? { url: launch.url } : { command: launch.command, args: launch.args };
      return [{ label: "Generic MCP config", language: "json", code: json({ mcpServers: { [key]: body } }) }];
    }
  }
}

/** Every code block for a resource, joined — powers the "copy all" button. */
export function usageBundle(steps: UsageStep[]): string {
  return steps
    .filter((s) => s.code)
    .map((s) => s.code)
    .join("\n\n");
}

/* ------------------------------------------------------------------ *
 * Skill install/usage generation
 * ------------------------------------------------------------------ */

export function skillUsage(skill: Skill, aiId: string): UsageStep[] {
  const marketplace = skill.repo; // e.g. anthropics/skills
  switch (aiId) {
    case "claude-code":
      return [
        { label: "Add the marketplace", language: "bash", code: `/plugin marketplace add ${marketplace}` },
        { label: "Install the skill", language: "bash", code: `/plugin install ${skill.slug}@${marketplace.split("/")[1]}` },
        { label: "Use it", note: "Claude auto-invokes the skill when your request matches its description — or type its slash command if it exposes one." },
      ];
    case "claude-desktop":
      return [
        { label: "Clone the source", language: "bash", code: `git clone ${skill.sourceUrl}` },
        { label: "Add the SKILL.md to your Skills folder", note: "Settings → Capabilities → Skills → add the folder containing SKILL.md. Claude picks it up automatically." },
      ];
    case "cursor":
      return [
        { label: "Grab the skill's instructions", language: "bash", code: `git clone ${skill.sourceUrl}` },
        { label: "Convert to a Cursor rule", note: "Create .cursor/rules/" + skill.slug + ".mdc and paste the SKILL.md body. Set `alwaysApply` or a glob so the Agent loads it in context." },
      ];
    case "codex":
      return [
        { label: "Clone it", language: "bash", code: `git clone ${skill.sourceUrl}` },
        { label: "Reference in AGENTS.md", note: "Add the skill's instructions (or a link) to AGENTS.md at your repo root — Codex reads it on every run." },
      ];
    case "windsurf":
    case "cline":
    case "vscode":
      return [
        { label: "Clone the skill", language: "bash", code: `git clone ${skill.sourceUrl}` },
        { label: "Add to your rules / context", note: `Paste the SKILL.md instructions into this tool's custom rules or workspace instructions so the agent follows them.` },
      ];
    default:
      return [{ label: "Clone", language: "bash", code: `git clone ${skill.sourceUrl}` }];
  }
}

/* ------------------------------------------------------------------ *
 * Repo usage generation
 * ------------------------------------------------------------------ */

export function repoUsage(repo: Repo, aiId: string): UsageStep[] {
  const clone = `git clone ${repo.url}.git`;
  switch (aiId) {
    case "claude-code":
      return [
        { label: "Clone & open", language: "bash", code: `${clone}\ncd ${repo.name}\nclaude` },
        { label: "Let Claude read it", note: "Ask “/init” to generate a CLAUDE.md, then have Claude explain, run, or extend the codebase. It reads files on demand." },
      ];
    case "cursor":
      return [
        { label: "Clone & open in Cursor", language: "bash", code: `${clone}` },
        { label: "Index & chat", note: "Open the folder — Cursor indexes it automatically. Use @Codebase in chat to ask about it or scaffold from it." },
      ];
    case "codex":
      return [
        { label: "Clone", language: "bash", code: clone },
        { label: "Point Codex at it", note: "Run codex in the repo root; add setup notes to AGENTS.md so the agent knows how to build & test." },
      ];
    case "windsurf":
      return [
        { label: "Clone & open", language: "bash", code: clone },
        { label: "Use Cascade", note: "Windsurf indexes the workspace; ask Cascade to explain or reuse modules from the repo." },
      ];
    default:
      return [
        { label: "Clone the repository", language: "bash", code: clone },
        { label: "Open in your AI editor", note: "Open the folder in your assistant and ask it to index the codebase, then reference files in chat." },
      ];
  }
}

/* ------------------------------------------------------------------ *
 * One-click install links
 * ------------------------------------------------------------------ */

/**
 * The server body each editor expects inside its install link — the same
 * shape as that editor's mcp.json entry.
 */
function installBody(launch: Exclude<Launch, { mode: "unknown" }>) {
  return launch.mode === "remote"
    ? { type: launch.transport, url: launch.url }
    : { type: "stdio", command: launch.command, args: launch.args };
}

export interface InstallLink {
  id: string;
  label: string;
  href: string;
}

/**
 * Deep links that hand the config straight to the editor.
 *
 * VS Code registers `vscode:mcp/install?<url-encoded JSON>` with the name
 * inside the JSON; Cursor uses
 * `cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=<base64 JSON>`
 * with the name as a separate query parameter.
 */
export function installLinks(mcp: Mcp): InstallLink[] {
  const resolved = launchFor(mcp);
  if (resolved.mode === "unknown") return [];

  const key = keyFor(mcp);
  const body = installBody(resolved);

  const vscodeConfig = encodeURIComponent(JSON.stringify({ name: key, ...body }));

  // btoa is byte-oriented, so non-ASCII in a URL would throw without this.
  const base64 =
    typeof window === "undefined"
      ? Buffer.from(JSON.stringify(body), "utf8").toString("base64")
      : btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(body))));

  return [
    { id: "vscode", label: "VS Code", href: `vscode:mcp/install?${vscodeConfig}` },
    { id: "vscode-insiders", label: "VS Code Insiders", href: `vscode-insiders:mcp/install?${vscodeConfig}` },
    {
      id: "cursor",
      label: "Cursor",
      href: `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(key)}&config=${encodeURIComponent(base64)}`,
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Multi-server config assembly (the setup builder)
 * ------------------------------------------------------------------ */

/**
 * A server reduced to what a config file needs. Serializable, so the client
 * bundle can carry the whole catalog's worth without the raw registry objects.
 */
export interface ServerEntry {
  slug: string;
  key: string;
  name: string;
  launch: Launch;
}

export function serverEntry(mcp: Mcp): ServerEntry {
  return { slug: mcp.slug, key: keyFor(mcp), name: mcp.name, launch: launchFor(mcp) };
}

/** The per-client body for one server, matching that client's schema. */
function bodyFor(launch: Launch, aiId: string): Record<string, unknown> | null {
  if (launch.mode === "unknown") return null;
  const remote = launch.mode === "remote";

  switch (aiId) {
    case "claude-desktop":
    case "codex":
      // stdio-only clients: remote servers are bridged through mcp-remote.
      return remote ? remoteBridge(launch.url) : { command: launch.command, args: launch.args };
    case "vscode":
      return remote
        ? { type: launch.transport, url: launch.url }
        : { type: "stdio", command: launch.command, args: launch.args };
    case "windsurf":
      return remote ? { serverUrl: launch.url } : { command: launch.command, args: launch.args };
    case "cline":
      return remote
        ? { type: launch.transport === "sse" ? "sse" : "streamableHttp", url: launch.url }
        : { command: launch.command, args: launch.args };
    default:
      return remote ? { url: launch.url } : { command: launch.command, args: launch.args };
  }
}

export interface MergedConfig {
  language: string;
  code: string;
  /** Where the snippet belongs on disk, shown above the block. */
  target: string;
}

/**
 * One config covering every selected server. Setting up a new machine
 * previously meant copying each server's block and hand-merging the JSON.
 */
/** Entries that actually have something to install. */
type UsableEntry = ServerEntry & { launch: Exclude<Launch, { mode: "unknown" }> };

const isUsable = (e: ServerEntry): e is UsableEntry => e.launch.mode !== "unknown";

export function mergedConfig(entries: ServerEntry[], aiId: string): MergedConfig {
  const usable = entries.filter(isUsable);

  if (aiId === "claude-code") {
    // The CLI takes one server per invocation, so this is a script.
    const lines = usable.map((e) =>
      e.launch.mode === "remote"
        ? `claude mcp add --transport ${e.launch.transport} ${e.key} ${e.launch.url}`
        : `claude mcp add ${e.key} -- ${e.launch.command} ${e.launch.args.join(" ")}`,
    );
    return { language: "bash", code: lines.join("\n") || "# no servers selected", target: "Run in your project" };
  }

  if (aiId === "codex") {
    const blocks = usable.flatMap((e) => {
      const body = bodyFor(e.launch, aiId) as { command: string; args: string[] } | null;
      if (!body) return [];
      return [
        `[mcp_servers.${e.key}]\ncommand = "${body.command}"\nargs = [${body.args
          .map((a) => `"${a}"`)
          .join(", ")}]`,
      ];
    });
    return { language: "toml", code: blocks.join("\n\n") || "# no servers selected", target: "~/.codex/config.toml" };
  }

  const servers: Record<string, unknown> = {};
  for (const e of usable) {
    const body = bodyFor(e.launch, aiId);
    if (body) servers[e.key] = body;
  }

  const wrapper = aiId === "vscode" ? "servers" : "mcpServers";
  const target =
    aiId === "vscode"
      ? ".vscode/mcp.json"
      : aiId === "cursor"
        ? ".cursor/mcp.json"
        : aiId === "windsurf"
          ? "~/.codeium/windsurf/mcp_config.json"
          : aiId === "cline"
            ? "cline_mcp_settings.json"
            : "claude_desktop_config.json";

  return { language: "json", code: json({ [wrapper]: servers }), target };
}

/**
 * An instruction a user can paste straight into their agent, instead of
 * placing a config file by hand. Includes the concrete transport details so
 * the agent doesn't have to guess (and get it wrong the way most docs do).
 */
export function installPrompt(mcp: Mcp): string {
  const launch = launchFor(mcp);
  const key = keyFor(mcp);

  if (launch.mode === "unknown") {
    return `Look into the MCP server "${mcp.name}" (${mcp.repository ?? mcp.qualifiedName}) and tell me how to install it — the registry entry publishes no package or endpoint.`;
  }

  const how =
    launch.mode === "remote"
      ? `It is a remote ${launch.transport.toUpperCase()} server at ${launch.url}, so configure it as a remote/HTTP server — do not try to run it as a local command. If my client only supports stdio, wrap it with "npx -y mcp-remote ${launch.url}".`
      : `It runs as a local process: ${launch.command} ${launch.args.join(" ")}`;

  const creds = requirementNamesOf(mcp);
  const credLine = creds.length
    ? ` It needs ${creds.join(", ")} — ask me for the value(s) and put them in the environment rather than committing them.`
    : "";

  return [
    `Install the MCP server "${mcp.name}" for me and name it "${key}".`,
    how + credLine,
    `Add it to the right config file for my client, then verify it connected and list the tools it exposes.`,
  ].join("\n\n");
}

/** Names of credentials the registry says are required. */
function requirementNamesOf(mcp: Mcp): string[] {
  const env = mcp.packages.flatMap((p) => p.env ?? []);
  const headers = mcp.remotes.flatMap((r) => r.headers ?? []);
  return [...env, ...headers].filter((i) => i.required).map((i) => i.name);
}
