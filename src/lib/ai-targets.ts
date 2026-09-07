import type { Mcp, Skill, Repo, McpPackage } from "./types";

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

/**
 * How a server is actually launched. Remote servers are the common case in the
 * official registry (most entries ship no package at all), and they need a
 * completely different config shape from stdio ones — several clients cannot
 * speak HTTP directly and have to be bridged through `mcp-remote`.
 */
type Launch =
  | { mode: "stdio"; command: string; args: string[] }
  | { mode: "remote"; transport: "http" | "sse"; url: string };

/** Build the launch command for a packaged (stdio) server. */
function commandFor(pkg: McpPackage): { command: string; args: string[] } {
  const reg = (pkg.registryType || "").toLowerCase();
  if (reg.includes("pypi") || reg.includes("python")) {
    return { command: "uvx", args: [pkg.identifier] };
  }
  if (reg.includes("oci") || reg.includes("docker")) {
    return { command: "docker", args: ["run", "-i", "--rm", pkg.identifier] };
  }
  if (reg.includes("nuget")) {
    return { command: "dnx", args: [pkg.identifier] };
  }
  return { command: "npx", args: ["-y", pkg.identifier] };
}

/** Prefer a real package; fall back to the first remote endpoint. */
function launchFor(mcp: Mcp): Launch {
  const pkg = mcp.packages[0];
  if (pkg) return { mode: "stdio", ...commandFor(pkg) };

  const remote = mcp.remotes[0];
  if (remote) {
    const t = (remote.type || "").toLowerCase();
    return { mode: "remote", transport: t.includes("sse") ? "sse" : "http", url: remote.url };
  }

  // Neither — leave an obvious placeholder rather than a broken command.
  return { mode: "stdio", command: "npx", args: ["-y", `<package-for-${mcp.slug}>`] };
}

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
  const launch = launchFor(mcp);
  const remote = launch.mode === "remote";
  const toolHint = mcp.tools?.length ? ` (e.g. ${mcp.tools.slice(0, 3).join(", ")})` : "";

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
          note: "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json · Windows: %APPDATA%\Claude\claude_desktop_config.json",
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
