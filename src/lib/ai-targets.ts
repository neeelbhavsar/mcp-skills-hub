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

function pickPackage(mcp: Mcp): McpPackage | null {
  return mcp.packages[0] ?? null;
}

/** Build a shell command (command + args) from an MCP package. */
function commandFor(pkg: McpPackage): { command: string; args: string[] } {
  const reg = (pkg.registryType || "").toLowerCase();
  if (reg.includes("pypi") || reg.includes("python")) {
    return { command: "uvx", args: [pkg.identifier] };
  }
  if (reg.includes("oci") || reg.includes("docker")) {
    return { command: "docker", args: ["run", "-i", "--rm", pkg.identifier] };
  }
  // default: npm
  return { command: "npx", args: ["-y", pkg.identifier] };
}

function mcpServerJson(mcp: Mcp) {
  const pkg = pickPackage(mcp);
  const key = mcp.qualifiedName.split("/").pop() || mcp.slug;
  if (!pkg) {
    const remote = mcp.remotes[0];
    if (remote) {
      return { key, body: { url: remote.url } };
    }
    return { key, body: { command: "npx", args: ["-y", `<package-for-${key}>`] } };
  }
  const { command, args } = commandFor(pkg);
  return { key, body: { command, args } };
}

export function mcpUsage(mcp: Mcp, aiId: string): UsageStep[] {
  const { key, body } = mcpServerJson(mcp);
  const cmdLine = "command" in body ? `${body.command} ${(body.args || []).join(" ")}` : body.url;
  const jsonBlock = (wrapper: string, extra = "") =>
    JSON.stringify({ [wrapper]: { [key]: body } }, null, 2) + extra;

  switch (aiId) {
    case "claude-code":
      return [
        { label: "Add the server with one command", language: "bash", code: `claude mcp add ${key} -- ${cmdLine}` },
        { label: "Verify it's connected", language: "bash", code: `claude mcp list` },
        { label: "Use it in a session", note: `Just ask Claude to use the tools this server exposes${mcp.tools?.length ? ` (e.g. ${mcp.tools.slice(0, 3).join(", ")})` : ""}. Claude discovers them automatically.` },
      ];
    case "claude-desktop":
      return [
        { label: "Open your MCP config", note: "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json · Windows: %APPDATA%\\Claude\\claude_desktop_config.json" },
        { label: "Add this server", language: "json", code: jsonBlock("mcpServers") },
        { label: "Restart Claude Desktop", note: "The tools appear under the 🔌 menu once the app reloads." },
      ];
    case "cursor":
      return [
        { label: "Create / edit .cursor/mcp.json in your project", language: "json", code: jsonBlock("mcpServers") },
        { label: "Enable it", note: "Cursor Settings → MCP → toggle the server on. Tools become available to the Composer/Agent." },
      ];
    case "windsurf":
      return [
        { label: "Edit ~/.codeium/windsurf/mcp_config.json", language: "json", code: jsonBlock("mcpServers") },
        { label: "Reload", note: "Windsurf → Cascade → refresh MCP servers. Cascade can now call the tools." },
      ];
    case "cline":
      return [
        { label: "Open Cline → MCP Servers → Configure", note: "Adds to cline_mcp_settings.json." },
        { label: "Add the server", language: "json", code: jsonBlock("mcpServers") },
      ];
    case "vscode":
      return [
        { label: "Create .vscode/mcp.json", language: "json", code: jsonBlock("servers") },
        { label: "Start it", note: "VS Code shows a ▶ Start action above the server entry. Agent mode (Copilot Chat) can then use the tools." },
      ];
    case "codex":
      return [
        { label: "Add to ~/.codex/config.toml", language: "toml", code: "command" in body ? `[mcp_servers.${key}]\ncommand = "${body.command}"\nargs = [${(body.args || []).map((a) => `"${a}"`).join(", ")}]` : `[mcp_servers.${key}]\nurl = "${body.url}"` },
        { label: "Run Codex", note: "Codex loads MCP servers from config.toml on startup and exposes their tools to the agent." },
      ];
    default:
      return [{ label: "Generic MCP config", language: "json", code: jsonBlock("mcpServers") }];
  }
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
