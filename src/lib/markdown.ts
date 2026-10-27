import type { Mcp, Repo, Skill } from "./types";
import { AI_TARGETS, mcpUsage, skillUsage, repoUsage, type UsageStep } from "./ai-targets";
import { mcpGlance, skillGlance } from "./glance";
import { skillTitle } from "./view";
import { SITE_NAME, absoluteUrl, resourcePath } from "./seo";

/**
 * Plain-Markdown versions of the detail pages, for agents that would rather
 * not parse HTML. Served at /md/<kind>/<slug> and advertised from each page
 * with <link rel="alternate" type="text/markdown">.
 */

function steps(list: UsageStep[]) {
  return list
    .map((s, i) => {
      const parts = [`${i + 1}. ${s.label}`];
      if (s.code) parts.push("", "```" + (s.language ?? ""), s.code, "```");
      if (s.note) parts.push("", `   ${s.note}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

function installSections(title: string, stepsFor: (client: string) => UsageStep[]) {
  return AI_TARGETS.map((t) => `### How to install ${title} in ${t.name}\n\n${steps(stepsFor(t.id))}`).join("\n\n");
}

const footer = (path: string, updatedAt: string) =>
  `---\n\nSource: ${absoluteUrl(path)} · ${SITE_NAME} · data as of ${updatedAt}`;

export function mcpMarkdown(m: Mcp, updatedAt: string) {
  const path = resourcePath("mcps", m.slug);
  const tools = m.tools?.length
    ? `## Tools\n\n${m.tools.map((t) => `- \`${t.name}\`${t.description ? ` — ${t.description.replace(/\s+/g, " ")}` : ""}`).join("\n")}`
    : "";
  return [
    `# ${m.name} MCP server`,
    m.description,
    `## At a glance\n\n${mcpGlance(m, updatedAt)}`,
    `## Install\n\n${installSections(m.name, (c) => mcpUsage(m, c))}`,
    tools,
    m.repository ? `Source repository: ${m.repository}` : "",
    footer(path, updatedAt),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function skillMarkdown(s: Skill, updatedAt: string) {
  const title = skillTitle(s.name);
  return [
    `# ${title} — Agent Skill`,
    s.description,
    `## At a glance\n\n${skillGlance(s, updatedAt)}`,
    s.skills.length ? `## Included skills\n\n${s.skills.map((k) => `- ${k}`).join("\n")}` : "",
    `## Install\n\n${installSections(title, (c) => skillUsage(s, c))}`,
    `Source: ${s.sourceUrl}`,
    footer(resourcePath("skills", s.slug), updatedAt),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function repoMarkdown(r: Repo, updatedAt: string) {
  return [
    `# ${r.fullName}`,
    r.description,
    `${r.stars.toLocaleString("en-US")} stars · ${r.forks.toLocaleString("en-US")} forks${r.language ? ` · ${r.language}` : ""}${r.license ? ` · ${r.license}` : ""}`,
    r.topics.length ? `Topics: ${r.topics.join(", ")}` : "",
    `## Use it\n\n${installSections(r.name, (c) => repoUsage(r, c))}`,
    footer(resourcePath("repos", r.slug), updatedAt),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** A one-entry summary for llms-full.txt: everything an agent needs, nothing it doesn't. */
export function mcpSummaryMarkdown(m: Mcp, updatedAt: string) {
  const claude = mcpUsage(m, "claude-code").find((s) => s.code)?.code;
  return [
    `### ${m.name}`,
    `${absoluteUrl(resourcePath("mcps", m.slug))}`,
    mcpGlance(m, updatedAt),
    claude ? "```bash\n" + claude + "\n```" : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
