// Pull an MCP server's tool list out of its README.
//
// Live `tools/list` probing only works for remote servers that don't need
// credentials — asking a packaged server would mean executing an untrusted
// package on the build machine. That left every stdio server (and every
// auth-walled remote) showing a bare "tools unknown", even though nearly all
// of them document their tools in the README. This reads that documentation.
//
// Only the formats publishers actually use are recognised, and only inside a
// section whose heading says it is about tools, so a README that merely
// mentions a CLI command doesn't get parsed into fake tools:
//
//   | `tool_name` | description |          (tables)
//   - `tool_name` - description             (bullets, backticks or bold)
//   - **tool_name**                          (reference servers: description
//     - Description on a nested bullet        on the next nested line)
//   ### `tool_name`                          (a heading per tool)

const MAX_TOOLS = 80;
const MAX_DESC = 240;

const TOOLS_HEADING = /^(#{1,5})\s+(?:[^\n]*?\b)?(tools?|tool list|available tools|mcp tools|capabilities|functions)\b[^\n]*$/i;
const HEADING = /^(#{1,6})\s+/;

// snake_case, kebab-case, dotted or camelCase: what tool names look like.
const TOOL_SHAPE = /^[a-z][a-z0-9]*(?:[_.-][a-z0-9]+)+$|^[a-z]+(?:[A-Z][a-z0-9]*)+$/;
// A bare lowercase word only counts when the author code-formatted it.
const PLAIN_WORD = /^[a-z][a-z0-9]{1,40}$/;

/** Words that show up formatted inside tool sections but are never tools. */
const NOT_TOOLS = new Set([
  "input", "inputs", "output", "returns", "return", "parameters", "params", "args", "arguments",
  "required", "optional", "string", "number", "boolean", "object", "array", "integer", "null",
  "true", "false", "example", "examples", "note", "tool", "tools", "name", "description", "type",
  "default", "response", "request", "json", "yaml", "true", "npm", "npx", "uvx", "docker", "stdio",
  "http", "sse", "mcp", "env", "readme", "license", "install", "usage", "config",
]);

function cleanDescription(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:—–-]+/, "")
    .trim()
    .slice(0, MAX_DESC) || null;
}

/** `name(args)` → name; strips formatting; returns null unless it looks like a tool. */
function toolName(raw, formatted) {
  const name = raw.replace(/\(.*$/, "").replace(/[`*_]+$/g, "").replace(/^[`*_]+/g, "").trim();
  if (!name || NOT_TOOLS.has(name.toLowerCase())) return null;
  if (TOOL_SHAPE.test(name)) return name;
  if (formatted && PLAIN_WORD.test(name)) return name;
  return null;
}

/** Sections of the document whose heading is about tools. */
function toolSections(md) {
  const lines = md.split("\n");
  const sections = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    const m = TOOLS_HEADING.exec(lines[i]);
    if (!m) continue;
    // "Developer Tools" or "Tooling" style headings about something else are
    // filtered later by requiring tool-shaped names.
    const level = m[1].length;
    const body = [];
    let fence = false;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*```/.test(lines[j])) fence = !fence;
      const h = !fence && HEADING.exec(lines[j]);
      if (h && h[1].length <= level) break;
      body.push(lines[j]);
    }
    sections.push(body);
  }
  return sections;
}

const TABLE_ROW = /^\s*\|/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}/;
/** Header cells that mark a table of parameters or settings, not tools. */
const PARAM_HEADER = /^(args?|arguments?|params?|parameters?|fields?|options?|variables?|env(ironment)?( var(iable)?s?)?|propert(y|ies)|inputs?|keys?|flags?|settings?)$/i;
const PARAM_LABEL = /^\s*[*_]*(inputs?|parameters?|params|arguments?|args|options)[*_]*\s*:?\s*[*_]*\s*$/i;
const LOOKS_LIKE_TYPE =/^(string|number|boolean|bool|integer|int|float|object|array|null|any)(\[\])?\b/i;

const cells = (line) =>
  line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.replace(/[`*]/g, "").trim());

function parseSection(lines) {
  const tools = [];
  let fence = false;
  // Whether the table we're inside describes parameters (skip) or tools.
  let skipTable = false;
  let inParams = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;

    if (!TABLE_ROW.test(line)) skipTable = false;
    // A header row is the one directly above the |---| separator.
    if (TABLE_ROW.test(line) && TABLE_SEPARATOR.test(lines[i + 1] ?? "")) {
      const [first = "", second = ""] = cells(line);
      skipTable = PARAM_HEADER.test(first) || /^type$/i.test(second);
      i++;
      continue;
    }
    if (skipTable) continue;

    // Table row: | `name` | description | …
    const row = /^\s*\|\s*(`[^`]+`|\*\*[^*]+\*\*|[A-Za-z][\w.-]*(?:\([^)]*\))?)\s*[^|]*\|\s*([^|]*)\|/.exec(line);
    if (row && !TABLE_SEPARATOR.test(line) && !LOOKS_LIKE_TYPE.test(row[2].replace(/[`*]/g, "").trim())) {
      const formatted = /^[`*]/.test(row[1]);
      const name = toolName(row[1].replace(/[`*]/g, ""), formatted);
      if (name) tools.push({ name, description: cleanDescription(row[2]) });
      continue;
    }

    // "**Inputs:**" introduces a parameter list; its bullets are not tools.
    // It lasts until the next heading or unindented prose.
    if (PARAM_LABEL.test(line)) {
      inParams = true;
      continue;
    }
    if (inParams) {
      if (HEADING.test(line) || (/^\S/.test(line) && !/^[-*+]|^\d+\./.test(line))) inParams = false;
      else continue;
    }

    // Top-level bullet or numbered item (indent ≤ 1):
    //   - `name` - description / - **name**: description / 1. `name`
    const bullet = /^( ?)(?:[-*+]|\d+\.)\s+(`[^`]+`|\*\*[^*]+\*\*)\s*(.*)$/.exec(line);
    if (bullet) {
      // `name` (string): … is a parameter written in the same style.
      if (/^\(\s*(string|number|boolean|integer|int|float|object|array|any)\b/i.test(bullet[3])) continue;
      const name = toolName(bullet[2].replace(/[`*]/g, ""), true);
      if (!name) continue;
      let description = cleanDescription(bullet[3]);
      // Reference-server style: the description sits on the next nested
      // bullet, followed by "Input:" / "Returns:" lines that aren't it.
      if (!description) {
        for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
          const nested = /^\s{2,}[-*+]\s+(.*)$/.exec(lines[j]);
          if (!nested) break;
          if (/^(inputs?|returns?|parameters?|output|args?)\b/i.test(nested[1].replace(/[`*]/g, ""))) continue;
          description = cleanDescription(nested[1]);
          break;
        }
      }
      tools.push({ name, description });
      continue;
    }

    // One heading per tool: ### `name` — followed by a paragraph.
    const heading = /^#{2,6}\s+(`[^`]+`|[A-Za-z][\w.-]+(?:\([^)]*\))?)\s*$/.exec(line);
    if (heading) {
      const name = toolName(heading[1].replace(/`/g, ""), heading[1].startsWith("`"));
      if (!name) continue;
      let description = null;
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        const t = lines[j].trim();
        if (!t) continue;
        if (HEADING.test(t) || t.startsWith("```") || t.startsWith("|")) break;
        description = cleanDescription(t.replace(/^[-*+]\s+/, ""));
        break;
      }
      tools.push({ name, description });
    }
  }
  return tools;
}

/**
 * @returns {{ name: string, description: string | null, inputs: null }[]}
 *   Empty when the README has no recognisable tool section. A section that
 *   yields a single match is dropped unless its heading literally says
 *   "Tools": one formatted word under "Capabilities" is more often noise.
 */
export function extractTools(markdown) {
  if (!markdown) return [];
  const seen = new Set();
  const out = [];
  for (const section of toolSections(markdown)) {
    const found = parseSection(section);
    for (const t of found) {
      const key = t.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: t.name, description: t.description, inputs: null });
      if (out.length >= MAX_TOOLS) return out;
    }
  }
  // Two or more distinct tool-shaped names is a list; one is often a stray
  // mention, unless it's explicitly documented with a description.
  if (out.length === 1 && !out[0].description) return [];
  return out;
}
