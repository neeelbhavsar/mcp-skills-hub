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

/* ------------------------------------------------------------------ *
 * Credentials → placeholders
 * ------------------------------------------------------------------ */

/**
 * One value the user has to fill in before the config works. Generated
 * configs used to omit these entirely, so a server that needs an API key got
 * a config that looked complete and failed on first launch — and teams had no
 * obvious slot to wire their secret manager into.
 */
export interface Credential {
  name: string;
  placeholder: string;
}

export interface Credentials {
  env: Credential[];
  headers: Credential[];
}

const NO_CREDENTIALS: Credentials = { env: [], headers: [] };

/** Angle brackets read unmistakably as "replace me"; shell snippets quote them. */
function placeholderFor(name: string) {
  if (/^authorization$/i.test(name)) return "Bearer <YOUR_TOKEN>";
  return `<${name.replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase()}>`;
}

/** Required values and secrets go into the snippet; optional config stays in the requirements panel. */
export function credentialsOf(mcp: Mcp): Credentials {
  const pick = (list: { name: string; required: boolean; secret: boolean }[] | undefined) =>
    (list ?? []).filter((i) => i.required || i.secret).map((i) => ({ name: i.name, placeholder: placeholderFor(i.name) }));
  return { env: pick(mcp.packages[0]?.env), headers: pick(mcp.remotes[0]?.headers) };
}

const envVarFor = (header: string) =>
  /^authorization$/i.test(header) ? "AUTH_HEADER" : header.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();

const toRecord = (list: Credential[]) => Object.fromEntries(list.map((c) => [c.name, c.placeholder]));

/**
 * Bridge a remote server through mcp-remote for stdio-only clients. Headers
 * go through env-var interpolation (`Name:${VAR}`), as mcp-remote's docs
 * recommend: Claude Desktop on Windows splits args containing spaces, which
 * mangles an inline "Bearer <token>".
 */
function remoteBridge(url: string, headers: Credential[] = []) {
  const args = ["-y", "mcp-remote", url];
  const env: Record<string, string> = {};
  for (const h of headers) {
    const v = envVarFor(h.name);
    args.push("--header", `${h.name}:\${${v}}`);
    env[v] = h.placeholder;
  }
  return headers.length ? { command: "npx", args, env } : { command: "npx", args };
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

/**
 * Quote an argument for a POSIX shell line when it needs it. Registry
 * placeholders such as `<path>` would otherwise be read as a redirect.
 */
const shellArg = (a: string) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, "'\\''")}'`);
const shellArgs = (args: string[]) => args.map(shellArg).join(" ");

type Runnable = Exclude<Launch, { mode: "unknown" }>;

/** `claude mcp add …` for one server, credentials included as quoted flags. */
function claudeAddCommand(key: string, launch: Runnable, creds: Credentials, scope?: "project") {
  const scoped = scope ? ` --scope ${scope}` : "";
  if (launch.mode === "remote") {
    // `--transport` is required for remote servers; without it the CLI tries
    // to execute the URL as a local binary.
    const headers = creds.headers.map((h) => ` --header ${shellArg(`${h.name}: ${h.placeholder}`)}`).join("");
    return `claude mcp add${scoped} --transport ${launch.transport} ${key} ${launch.url}${headers}`;
  }
  const env = creds.env.map((e) => ` -e ${shellArg(`${e.name}=${e.placeholder}`)}`).join("");
  return `claude mcp add${scoped} ${key}${env} -- ${launch.command} ${shellArgs(launch.args)}`;
}

const tomlString = (v: string) => JSON.stringify(v);

/** One `[mcp_servers.key]` table for Codex's config.toml. */
function codexBlock(key: string, body: { command: string; args: string[]; env?: Record<string, string> }) {
  const lines = [`[mcp_servers.${key}]`, `command = ${tomlString(body.command)}`, `args = [${body.args.map(tomlString).join(", ")}]`];
  if (body.env && Object.keys(body.env).length) {
    lines.push(`env = { ${Object.entries(body.env).map(([k, v]) => `${k} = ${tomlString(v)}`).join(", ")} }`);
  }
  return lines.join("\n");
}

/** The note under any snippet that contains placeholders. */
function placeholderNote(creds: Credentials): UsageStep[] {
  const all = [...creds.env, ...creds.headers];
  if (all.length === 0) return [];
  return [
    {
      label: "Fill in your credentials",
      note: `Replace ${all.map((c) => c.placeholder).join(", ")} with your real value${all.length === 1 ? "" : "s"}. Keep secrets out of any config file you commit.`,
    },
  ];
}

export function mcpUsage(mcp: Mcp, aiId: string): UsageStep[] {
  const key = keyFor(mcp);
  const creds = credentialsOf(mcp);
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

  const launch: Runnable = resolved;
  const remote = launch.mode === "remote";
  const fill = placeholderNote(creds);
  const body = (client: string) => bodyFor(launch, client, creds);

  switch (aiId) {
    case "claude-code":
      return [
        { label: "Add the server", language: "bash", code: claudeAddCommand(key, launch, creds) },
        ...fill,
        { label: "Verify it's connected", language: "bash", code: "claude mcp list" },
        {
          label: "Sharing it with your team?",
          note: "Add `--scope project` to write it to .mcp.json in the repository root, which you can commit (with the secrets left as environment variables).",
        },
        {
          label: "Use it in a session",
          note: `Ask Claude to use the tools this server exposes${toolHint}. It discovers them automatically.`,
        },
      ];

    case "claude-desktop":
      return [
        {
          label: "Open your MCP config",
          note: "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json · Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
        },
        { label: "Add this server", language: "json", code: json({ mcpServers: { [key]: body(aiId) } }) },
        ...fill,
        ...(remote
          ? [{
              label: "Why the wrapper?",
              note: "This is a remote (HTTP) server and Claude Desktop only launches local processes, so mcp-remote proxies the connection. It will open a browser window if the server needs OAuth.",
            }]
          : []),
        { label: "Restart Claude Desktop", note: "The tools appear under the 🔌 menu once the app reloads." },
      ];

    case "cursor":
      return [
        { label: "Create / edit .cursor/mcp.json in your project", language: "json", code: json({ mcpServers: { [key]: body(aiId) } }) },
        ...fill,
        { label: "Enable it", note: "Cursor Settings → MCP → toggle the server on. Tools become available to the Composer/Agent." },
      ];

    case "windsurf":
      return [
        { label: "Edit ~/.codeium/windsurf/mcp_config.json", language: "json", code: json({ mcpServers: { [key]: body(aiId) } }) },
        ...fill,
        { label: "Reload", note: "Windsurf → Cascade → refresh MCP servers. Cascade can now call the tools." },
      ];

    case "cline":
      return [
        { label: "Open Cline → MCP Servers → Configure", note: "Adds to cline_mcp_settings.json." },
        { label: "Add the server", language: "json", code: json({ mcpServers: { [key]: body(aiId) } }) },
        ...fill,
      ];

    case "vscode":
      return [
        { label: "Create .vscode/mcp.json", language: "json", code: json({ servers: { [key]: body(aiId) } }) },
        ...fill,
        { label: "Start it", note: "VS Code shows a ▶ Start action above the server entry. Agent mode (Copilot Chat) can then use the tools." },
      ];

    case "codex":
      return [
        { label: "Add to ~/.codex/config.toml", language: "toml", code: codexBlock(key, body(aiId) as { command: string; args: string[]; env?: Record<string, string> }) },
        ...fill,
        ...(remote
          ? [{ label: "Why the wrapper?", note: "Codex runs MCP servers as local processes, so mcp-remote bridges this HTTP endpoint to stdio." }]
          : []),
        { label: "Run Codex", note: "Codex loads MCP servers from config.toml on startup and exposes their tools to the agent." },
      ];

    default:
      return [{ label: "Generic MCP config", language: "json", code: json({ mcpServers: { [key]: body("generic") } }) }, ...fill];
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

/**
 * `git clone` needs the repository, not a /tree/ URL: skills that live in a
 * subfolder of a larger repo had `git clone https://github.com/o/r/tree/main/x`,
 * which fails. Clone the repo, then point at the folder.
 */
function skillClone(skill: Skill): UsageStep[] {
  const dir = skill.repo.split("/")[1];
  return [
    { label: "Clone the source", language: "bash", code: `git clone https://github.com/${skill.repo}.git` },
    ...(skill.subdir
      ? [{ label: "Find the skill", note: `It lives in ${dir}/${skill.subdir} — that folder contains the SKILL.md.` }]
      : []),
  ];
}

export function skillUsage(skill: Skill, aiId: string): UsageStep[] {
  const clone = skillClone(skill);
  switch (aiId) {
    case "claude-code": {
      const m = skill.marketplace;
      if (!m) {
        // Not in a plugin marketplace: install the folder as a personal skill.
        return [
          ...clone,
          {
            label: "Install it",
            note: `Copy the folder containing SKILL.md into ~/.claude/skills/ (all projects) or .claude/skills/ (this project).`,
          },
          { label: "Use it", note: "Claude auto-invokes the skill when your request matches its description." },
        ];
      }
      return [
        { label: "Add the marketplace", language: "claude", code: `/plugin marketplace add ${m.repo}` },
        // The suffix is the marketplace's declared name, which is not always
        // its repo name (anthropics/skills is "anthropic-agent-skills").
        { label: "Install the skill", language: "claude", code: `/plugin install ${skill.name}@${m.name}` },
        {
          label: "Use it",
          note: "These are slash commands for a Claude Code session, not your shell. Claude auto-invokes the skill when your request matches its description — or type its slash command if it exposes one.",
        },
      ];
    }
    case "claude-desktop":
      return [
        ...clone,
        { label: "Add the SKILL.md to your Skills folder", note: "Settings → Capabilities → Skills → add the folder containing SKILL.md. Claude picks it up automatically." },
      ];
    case "cursor":
      return [
        ...clone,
        { label: "Convert to a Cursor rule", note: "Create .cursor/rules/" + skill.slug + ".mdc and paste the SKILL.md body. Set `alwaysApply` or a glob so the Agent loads it in context." },
      ];
    case "codex":
      return [
        ...clone,
        { label: "Reference in AGENTS.md", note: "Add the skill's instructions (or a link) to AGENTS.md at your repo root — Codex reads it on every run." },
      ];
    case "windsurf":
    case "cline":
    case "vscode":
      return [
        ...clone,
        { label: "Add to your rules / context", note: `Paste the SKILL.md instructions into this tool's custom rules or workspace instructions so the agent follows them.` },
      ];
    default:
      return clone;
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
  // The editor's own mcp.json shape, placeholders included, so its
  // confirmation dialog shows what still has to be filled in.
  const body = bodyFor(resolved, "claude-code-project", credentialsOf(mcp));

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
  /** Values the user must supply; empty when the registry declares none. */
  credentials: Credentials;
  /** Published version to pin to, when the registry gives a real one. */
  version: string | null;
}

export function serverEntry(mcp: Mcp): ServerEntry {
  const pkg = mcp.packages[0];
  const version = pkg?.version && pkg.version !== "latest" ? pkg.version : null;
  return { slug: mcp.slug, key: keyFor(mcp), name: mcp.name, launch: launchFor(mcp), credentials: credentialsOf(mcp), version };
}

/**
 * The launch with its package pinned to `version`: `npx -y pkg@1.2.3`,
 * `uvx pkg@1.2.3`, `image:1.2.3`. Unpinned installs resolve to whatever is
 * latest at launch, so two teammates can silently run different code.
 */
function pinned(launch: Launch, version: string | null): Launch {
  if (launch.mode !== "stdio" || !version) return launch;
  const isDocker = launch.command === "docker";
  // The package identifier is the first argument that isn't a flag or a
  // docker option.
  // `docker run -i --rm <image>` (see compat.commandFor); otherwise the
  // first argument that isn't a flag.
  const i = isDocker ? (launch.args.length > 3 ? 3 : -1) : launch.args.findIndex((a) => !a.startsWith("-"));
  if (i < 0) return launch;
  const id = launch.args[i];
  // Already pinned: a version after the name (pkg@1.2.3), or any tag on an
  // image (image:latest would otherwise become image:latest:1.2.3).
  const bare = id.replace(/^@/, "");
  if (/@\d/.test(bare) || (isDocker && /:[^/]+$/.test(id))) return launch;
  const pin = isDocker ? `${id}:${version}` : `${id}@${version}`;
  return { ...launch, args: launch.args.map((a, n) => (n === i ? pin : a)) };
}

/**
 * The per-client body for one server, matching that client's schema.
 *
 * `claude-code-project` is the `.mcp.json` shape Claude Code reads from a
 * repository root — Cursor's shape plus an explicit `type`.
 */
export function bodyFor(launch: Launch, aiId: string, creds: Credentials = NO_CREDENTIALS): Record<string, unknown> | null {
  if (launch.mode === "unknown") return null;

  if (launch.mode === "remote") {
    const { url, transport } = launch;
    const withHeaders = (base: Record<string, unknown>) =>
      creds.headers.length ? { ...base, headers: toRecord(creds.headers) } : base;
    switch (aiId) {
      case "claude-desktop":
      case "codex":
        // stdio-only clients: remote servers are bridged through mcp-remote.
        return remoteBridge(url, creds.headers);
      case "vscode":
      case "claude-code-project":
        return withHeaders({ type: transport, url });
      case "windsurf":
        // Windsurf keys remote servers as `serverUrl`, not `url`.
        return withHeaders({ serverUrl: url });
      case "cline":
        return withHeaders({ type: transport === "sse" ? "sse" : "streamableHttp", url });
      default:
        return withHeaders({ url });
    }
  }

  // .vscode/mcp.json and .mcp.json require an explicit `type` discriminator.
  const typed = aiId === "vscode" || aiId === "claude-code-project";
  return {
    ...(typed ? { type: "stdio" } : {}),
    command: launch.command,
    args: launch.args,
    ...(creds.env.length ? { env: toRecord(creds.env) } : {}),
  };
}

export interface MergedConfig {
  language: string;
  code: string;
  /** Where the snippet belongs on disk, shown above the block. */
  target: string;
  /** Suggested file name for the download button. */
  filename: string;
  /** Every placeholder in the output, so the builder can list what to fill in. */
  placeholders: string[];
}

/** Where each client's config file lives, and what to name a download of it. */
export const CONFIG_TARGETS: Record<string, { target: string; filename: string }> = {
  "claude-code": { target: "your terminal, in the project", filename: "add-mcp-servers.sh" },
  "claude-code-project": { target: ".mcp.json in the repository root (commit it)", filename: ".mcp.json" },
  "claude-desktop": { target: "claude_desktop_config.json", filename: "claude_desktop_config.json" },
  cursor: { target: ".cursor/mcp.json", filename: "mcp.json" },
  codex: { target: "~/.codex/config.toml", filename: "config.toml" },
  windsurf: { target: "~/.codeium/windsurf/mcp_config.json", filename: "mcp_config.json" },
  cline: { target: "cline_mcp_settings.json", filename: "cline_mcp_settings.json" },
  vscode: { target: ".vscode/mcp.json", filename: "mcp.json" },
};

/** Entries that actually have something to install. */
type UsableEntry = ServerEntry & { launch: Runnable };

const isUsable = (e: ServerEntry): e is UsableEntry => e.launch.mode !== "unknown";

/**
 * One config covering every selected server. Setting up a new machine
 * previously meant copying each server's block and hand-merging the JSON.
 * `pin` locks packaged servers to their published version, for teams that
 * need everyone on the same code.
 */
export function mergedConfig(entries: ServerEntry[], aiId: string, { pin = false }: { pin?: boolean } = {}): MergedConfig {
  const usable = entries
    .filter(isUsable)
    .map((e) => (pin ? { ...e, launch: pinned(e.launch, e.version) as Runnable } : e));
  const { target, filename } = CONFIG_TARGETS[aiId] ?? CONFIG_TARGETS["claude-desktop"];
  const placeholders = [
    ...new Set(usable.flatMap((e) => [...e.credentials.env, ...e.credentials.headers].map((c) => c.placeholder))),
  ];

  if (aiId === "claude-code") {
    // The CLI takes one server per invocation, so this is a script.
    const lines = usable.map((e) => claudeAddCommand(e.key, e.launch, e.credentials));
    return { language: "bash", code: lines.join("\n") || "# no servers selected", target, filename, placeholders };
  }

  if (aiId === "codex") {
    const blocks = usable.flatMap((e) => {
      const body = bodyFor(e.launch, aiId, e.credentials) as { command: string; args: string[]; env?: Record<string, string> } | null;
      return body ? [codexBlock(e.key, body)] : [];
    });
    return { language: "toml", code: blocks.join("\n\n") || "# no servers selected", target, filename, placeholders };
  }

  const servers: Record<string, unknown> = {};
  for (const e of usable) {
    const body = bodyFor(e.launch, aiId, e.credentials);
    if (body) servers[e.key] = body;
  }

  const wrapper = aiId === "vscode" ? "servers" : "mcpServers";
  return { language: "json", code: json({ [wrapper]: servers }), target, filename, placeholders };
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
