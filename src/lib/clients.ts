/**
 * Editorial setup guides, one per AI client.
 *
 * "How do I add an MCP server to Cursor?" is answered almost entirely by
 * how-to guides in search results; the site had none, only per-server pages.
 * These are hand-written facts about each client — where its config lives,
 * which transports it speaks, how to reload it and what usually goes wrong —
 * combined at render time with live catalog data.
 */
export interface ClientGuide {
  id: string;
  /** What the config file is called and where it lives, per OS where it differs. */
  configFiles: { label: string; path: string }[];
  /** The top-level key servers sit under. */
  wrapperKey: string;
  format: "json" | "toml" | "cli";
  transports: { stdio: boolean; http: boolean; sse: boolean };
  intro: string;
  steps: string[];
  reload: string;
  troubleshooting: { problem: string; fix: string }[];
  docsUrl: string;
}

const WINDOWS_NPX = {
  problem: "`npx` is not found, or the server exits immediately on Windows",
  fix: "Windows launches `npx` through cmd. Use `\"command\": \"cmd\"` with `\"args\": [\"/c\", \"npx\", \"-y\", \"<package>\"]`, and make sure Node.js 18+ is on the PATH of the user the client runs as.",
};

const NODE_VERSION = {
  problem: "`SyntaxError` or `Unsupported engine` when the server starts",
  fix: "Most MCP servers need Node.js 18 or newer (`node -v`). If you use nvm, the client may not see your shell's Node: point `command` at the absolute path of `npx`.",
};

const UVX = {
  problem: "`uvx: command not found` for Python servers",
  fix: "Install uv (`curl -LsSf https://astral.sh/uv/install.sh | sh`, or `winget install astral-sh.uv` on Windows), then restart the client so it picks up the new PATH.",
};

const SECRETS = {
  problem: "The server starts but every tool call fails with 401 or 403",
  fix: "Its API key is missing or wrong. Put it in the server's `env` block (or the header for remote servers) — never in a file you commit.",
};

export const CLIENT_GUIDES: Record<string, ClientGuide> = {
  "claude-code": {
    id: "claude-code",
    configFiles: [
      { label: "Project (shared with your team)", path: ".mcp.json in the repository root" },
      { label: "User (all projects)", path: "~/.claude.json, written by `claude mcp add --scope user`" },
    ],
    wrapperKey: "mcpServers",
    format: "cli",
    transports: { stdio: true, http: true, sse: true },
    intro:
      "Claude Code adds MCP servers from the command line with `claude mcp add`, and also reads a project-level `.mcp.json` you can commit so the whole team gets the same servers.",
    steps: [
      "Run `claude mcp add <name> -- <command> <args>` for a local server, or `claude mcp add --transport http <name> <url>` for a remote one.",
      "Pass credentials with `-e KEY=value` (local) or `--header \"Authorization: Bearer …\"` (remote).",
      "Check it connected with `claude mcp list`, or `/mcp` inside a session.",
    ],
    reload: "New servers are picked up the next time you start `claude`. Use `/mcp` in a session to reconnect one.",
    troubleshooting: [
      {
        problem: "A remote server is added but Claude tries to execute the URL",
        fix: "`--transport http` (or `sse`) is required for remote servers; without it the URL is treated as a local command.",
      },
      NODE_VERSION,
      UVX,
      SECRETS,
    ],
    docsUrl: "https://docs.anthropic.com/en/docs/claude-code/mcp",
  },
  "claude-desktop": {
    id: "claude-desktop",
    configFiles: [
      { label: "macOS", path: "~/Library/Application Support/Claude/claude_desktop_config.json" },
      { label: "Windows", path: "%APPDATA%\\Claude\\claude_desktop_config.json" },
    ],
    wrapperKey: "mcpServers",
    format: "json",
    transports: { stdio: true, http: false, sse: false },
    intro:
      "Claude Desktop reads servers from `claude_desktop_config.json` (Settings → Developer → Edit Config opens it). It launches local processes only, so remote servers are bridged through `mcp-remote`.",
    steps: [
      "Open Settings → Developer → Edit Config.",
      "Add each server under `mcpServers` with its `command`, `args` and, if needed, `env`.",
      "For a remote server, use `npx -y mcp-remote <url>` as the command.",
      "Fully quit and reopen Claude Desktop.",
    ],
    reload: "Quit Claude Desktop completely (not just close the window) and reopen it. Tools appear under the 🔌 menu.",
    troubleshooting: [
      WINDOWS_NPX,
      NODE_VERSION,
      {
        problem: "Nothing appears after editing the file",
        fix: "A single trailing comma makes the whole file invalid JSON and every server silently disappears. Validate it, then check the logs in ~/Library/Logs/Claude (macOS) or %APPDATA%\\Claude\\logs (Windows).",
      },
      UVX,
      SECRETS,
    ],
    docsUrl: "https://modelcontextprotocol.io/quickstart/user",
  },
  cursor: {
    id: "cursor",
    configFiles: [
      { label: "Project", path: ".cursor/mcp.json" },
      { label: "Global", path: "~/.cursor/mcp.json" },
    ],
    wrapperKey: "mcpServers",
    format: "json",
    transports: { stdio: true, http: true, sse: true },
    intro:
      "Cursor reads `mcp.json` from your project's `.cursor` folder or your home directory, speaks both local (stdio) and remote (HTTP/SSE) servers, and supports one-click install links.",
    steps: [
      "Create `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` for every project).",
      "Add each server under `mcpServers`: `command`/`args` for local servers, `url` for remote ones.",
      "Open Cursor Settings → MCP and toggle the server on.",
    ],
    reload: "Cursor detects changes to mcp.json; toggle the server off and on in Settings → MCP if it doesn't.",
    troubleshooting: [
      WINDOWS_NPX,
      NODE_VERSION,
      {
        problem: "The server shows a red dot in Settings → MCP",
        fix: "Click it to see the error output. Most often the package name is wrong or a required argument (such as an allowed directory) is missing.",
      },
      SECRETS,
    ],
    docsUrl: "https://docs.cursor.com/context/model-context-protocol",
  },
  codex: {
    id: "codex",
    configFiles: [{ label: "All platforms", path: "~/.codex/config.toml" }],
    wrapperKey: "mcp_servers",
    format: "toml",
    transports: { stdio: true, http: false, sse: false },
    intro:
      "OpenAI's Codex CLI configures MCP servers in TOML, one `[mcp_servers.<name>]` table each. It launches local processes, so remote servers go through `mcp-remote`.",
    steps: [
      "Open `~/.codex/config.toml`.",
      "Add a `[mcp_servers.<name>]` table with `command`, `args` and an optional `env = { KEY = \"value\" }`.",
      "Start `codex`; the servers load on startup.",
    ],
    reload: "Restart `codex` after editing config.toml.",
    troubleshooting: [
      { problem: "Codex fails to parse config.toml", fix: "TOML strings need double quotes, and `args` is an array: `args = [\"-y\", \"pkg\"]`." },
      NODE_VERSION,
      UVX,
      SECRETS,
    ],
    docsUrl: "https://github.com/openai/codex",
  },
  windsurf: {
    id: "windsurf",
    configFiles: [{ label: "All platforms", path: "~/.codeium/windsurf/mcp_config.json" }],
    wrapperKey: "mcpServers",
    format: "json",
    transports: { stdio: true, http: true, sse: true },
    intro:
      "Windsurf's Cascade agent reads `mcp_config.json`. Remote servers are keyed as `serverUrl` rather than `url` — the most common reason a copied Cursor config fails here.",
    steps: [
      "Open Windsurf Settings → Cascade → MCP servers → View raw config.",
      "Add servers under `mcpServers`; use `serverUrl` for remote ones.",
      "Click refresh in the MCP panel.",
    ],
    reload: "Use the refresh button in Cascade's MCP panel.",
    troubleshooting: [
      { problem: "A remote server copied from Cursor's config doesn't connect", fix: "Rename `url` to `serverUrl` — Windsurf ignores `url`." },
      WINDOWS_NPX,
      NODE_VERSION,
      SECRETS,
    ],
    docsUrl: "https://docs.windsurf.com/windsurf/cascade/mcp",
  },
  cline: {
    id: "cline",
    configFiles: [{ label: "VS Code extension storage", path: "cline_mcp_settings.json (Cline → MCP Servers → Configure)" }],
    wrapperKey: "mcpServers",
    format: "json",
    transports: { stdio: true, http: true, sse: true },
    intro:
      "Cline keeps its servers in `cline_mcp_settings.json`, opened from the MCP Servers panel. Remote servers need an explicit `type` of `streamableHttp` or `sse`.",
    steps: [
      "Open the Cline sidebar → MCP Servers → Configure MCP Servers.",
      "Add servers under `mcpServers`; give remote ones `type` and `url`.",
      "Save — Cline restarts the server automatically.",
    ],
    reload: "Cline reloads on save; use the restart button next to a server to retry it.",
    troubleshooting: [WINDOWS_NPX, NODE_VERSION, SECRETS],
    docsUrl: "https://docs.cline.bot/mcp/configuring-mcp-servers",
  },
  vscode: {
    id: "vscode",
    configFiles: [
      { label: "Workspace", path: ".vscode/mcp.json" },
      { label: "User", path: "MCP: Open User Configuration (command palette)" },
    ],
    wrapperKey: "servers",
    format: "json",
    transports: { stdio: true, http: true, sse: true },
    intro:
      "VS Code (Copilot agent mode) reads `.vscode/mcp.json`. Its schema differs from every other client: servers sit under `servers`, not `mcpServers`, and each needs a `type`.",
    steps: [
      "Create `.vscode/mcp.json` in your workspace.",
      "Add servers under `servers`, each with `type` (`stdio`, `http` or `sse`).",
      "Click the ▶ Start action that appears above the entry, then use Copilot Chat in agent mode.",
    ],
    reload: "Use the Start / Restart code lens above each server entry.",
    troubleshooting: [
      { problem: "A config copied from Cursor or Claude does nothing", fix: "VS Code wants `servers` (not `mcpServers`) and an explicit `type` on every entry." },
      WINDOWS_NPX,
      NODE_VERSION,
      SECRETS,
    ],
    docsUrl: "https://code.visualstudio.com/docs/copilot/chat/mcp-servers",
  },
};
