// Fetch AI "skills" for coding assistants. Primary clean-JSON source is the
// Anthropic marketplace.json manifests; enriched with awesome-list READMEs.

import { getJSON, getText, slugify, clean, categorize, log } from "./lib/util.mjs";

const SKILL_CATEGORIES = [
  { name: "Coding & Engineering", keys: ["code", "debug", "review", "refactor", "test", "lint", "typescript", "python", "api", "backend", "frontend", "git", "commit"] },
  { name: "Documents & Office", keys: ["pdf", "docx", "excel", "xlsx", "pptx", "word", "spreadsheet", "document", "slide", "presentation"] },
  { name: "Design & Creative", keys: ["design", "ui", "ux", "brand", "logo", "banner", "canvas", "artifact", "image", "video", "creative", "figma"] },
  { name: "Data & Analysis", keys: ["data", "analysis", "chart", "dataviz", "visualization", "research", "analytics", "sql", "csv"] },
  { name: "Writing & Content", keys: ["writing", "content", "blog", "copy", "seo", "marketing", "email", "summary", "translate"] },
  { name: "Automation & Workflow", keys: ["automation", "workflow", "agent", "orchestrat", "pipeline", "cron", "schedule", "deploy", "ci"] },
];

const catOf = (text) => categorize(text, SKILL_CATEGORIES);

const MANIFESTS = [
  { url: "https://raw.githubusercontent.com/anthropics/skills/main/.claude-plugin/marketplace.json", source: "Anthropic Skills", repo: "anthropics/skills" },
  { url: "https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json", source: "Claude Plugins (Official)", repo: "anthropics/claude-plugins-official" },
];

async function fromManifest({ url, source, repo }) {
  const out = [];
  try {
    const data = await getJSON(url, { label: source });
    const plugins = data.plugins || [];
    for (const p of plugins) {
      const desc = clean(p.description || "");
      const skillList = Array.isArray(p.skills) ? p.skills : [];
      out.push({
        id: `skill:${slugify(repo + "-" + p.name)}`,
        name: p.name,
        slug: slugify(p.name),
        description: desc,
        category: catOf(`${p.name} ${desc}`),
        author: data.owner?.name || repo.split("/")[0],
        skills: skillList.map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean),
        source,
        repo,
        sourceUrl: `https://github.com/${repo}`,
        target: "claude",
        tags: [],
        stars: null,
      });
    }
    log(`${source}: ${out.length} skill packs`);
  } catch (err) {
    log(`${source} failed: ${err.message}`);
  }
  return out;
}

// Parse `- [Name](url) - description` style list items from an awesome README.
function parseAwesomeReadme(md, { source, repo }) {
  const out = [];
  const seen = new Set();
  const re = /^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*[-–:]?\s*(.*)$/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    const [, name, link, rawDesc] = m;
    const url = link.trim();
    if (!url.startsWith("http")) continue;
    if (name.length < 2 || name.length > 60) continue;
    const key = slugify(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const desc = clean(rawDesc.replace(/[`*]/g, ""), 200) || `Community skill from ${repo}.`;
    // Skip obvious nav/section links.
    if (/^(contents|table of|contributing|license|back to top|home)$/i.test(name)) continue;
    out.push({
      id: `skill:${key}`,
      name,
      slug: key,
      description: desc,
      category: catOf(`${name} ${desc}`),
      author: repo.split("/")[0],
      skills: [],
      source,
      repo,
      sourceUrl: url,
      target: "multi",
      tags: [],
      stars: null,
    });
    if (out.length >= 120) break;
  }
  log(`${source}: parsed ${out.length} skills from README`);
  return out;
}

const AWESOME = [
  { url: "https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md", source: "awesome-agent-skills", repo: "VoltAgent/awesome-agent-skills" },
  { url: "https://raw.githubusercontent.com/travisvn/awesome-claude-skills/main/README.md", source: "awesome-claude-skills", repo: "travisvn/awesome-claude-skills" },
];

async function fromAwesome(entry) {
  try {
    const md = await getText(entry.url);
    return parseAwesomeReadme(md, entry);
  } catch (err) {
    log(`${entry.source} failed: ${err.message}`);
    return [];
  }
}

export async function fetchSkills() {
  const results = await Promise.all([
    ...MANIFESTS.map(fromManifest),
    ...AWESOME.map(fromAwesome),
  ]);
  const bySlug = new Map();
  for (const item of results.flat()) {
    if (!bySlug.has(item.slug)) bySlug.set(item.slug, item);
  }
  const all = [...bySlug.values()].filter((s) => s.name && s.description);
  log(`Skills total after dedupe: ${all.length}`);
  return all;
}
