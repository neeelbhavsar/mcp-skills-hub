import type { Mcp, Skill } from "./types";
import { launchFor } from "./compat";
import { healthOf, requirementsOf } from "./health";
import { SITE_NAME } from "./seo";

/**
 * A short, self-contained summary written from facts the catalog owns.
 *
 * Detail pages were mostly upstream text — the registry description and the
 * README — so there was nothing here an answer engine couldn't get from the
 * source, and the site's own data (health, tools, transport) appeared only as
 * UI fragments like "D · 33". These sentences state it as quotable prose,
 * with a date and an attribution.
 */

const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

const asOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function mcpGlance(m: Mcp, updatedAt: string): string {
  const launch = launchFor(m);
  const h = healthOf(m);
  const req = requirementsOf(m);
  const who = m.source === "Official reference" ? "the official MCP reference server" : "an MCP server";
  const lead = `${m.name} is ${who} in the ${m.category} category.`;

  const run =
    launch.mode === "stdio"
      ? `It runs locally over stdio via \`${launch.command} ${launch.args.join(" ")}\``
      : launch.mode === "remote"
        ? `It is hosted remotely and connects over ${launch.transport.toUpperCase()}`
        : "It publishes no package or endpoint yet";
  const key =
    req.required.length || req.secrets.length
      ? `, and needs ${list([...new Set([...req.required, ...req.secrets].map((i) => i.name))])}`
      : launch.mode === "unknown"
        ? ""
        : ", and declares no required credentials";
  const tools = m.tools?.length
    ? ` It exposes ${m.tools.length} tool${m.tools.length === 1 ? "" : "s"}, including ${list(m.tools.slice(0, 3).map((t) => t.name))}.`
    : "";
  const score =
    h.score !== null
      ? ` It scores ${h.grade} (${h.score}/100) on the ${SITE_NAME} health score as of ${asOf(updatedAt)}.`
      : "";

  return `${lead} ${run}${key}.${tools}${score}`;
}

export function skillGlance(s: Skill, updatedAt: string): string {
  const included = s.skills.length
    ? ` It bundles ${s.skills.length} skill${s.skills.length === 1 ? "" : "s"}.`
    : "";
  const install = s.marketplace
    ? ` In Claude Code it installs with \`/plugin install ${s.name}@${s.marketplace.name}\` after adding the ${s.marketplace.repo} marketplace; other assistants use its SKILL.md instructions as rules.`
    : " Install it by copying its folder into ~/.claude/skills/, or use its SKILL.md instructions as rules in other assistants.";
  const stars = s.stars != null ? ` Its source repository has ${s.stars.toLocaleString("en-US")} GitHub stars (as of ${asOf(updatedAt)}).` : "";
  return `${s.name} is an Agent Skill by ${s.author} in the ${s.category} category.${included}${install}${stars}`;
}
