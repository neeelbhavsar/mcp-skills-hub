// Fetch AI "skills" for coding assistants. Primary clean-JSON source is the
// Anthropic marketplace.json manifests; enriched with awesome-list READMEs.

import { getJSON, getText, slugify, clean, categorize, log } from "./lib/util.mjs";
import { attachRepoMeta } from "./lib/github.mjs";
import { attachReadmes } from "./lib/readme.mjs";

const SKILL_CATEGORIES = [
  { name: "Coding & Engineering", keys: ["code", "debug", "review", "refactor", "test", "lint", "typescript", "python", "api", "backend", "frontend", "git", "commit"] },
  { name: "Documents & Office", keys: ["pdf", "docx", "excel", "xlsx", "pptx", "word", "spreadsheet", "document", "slide", "presentation"] },
  { name: "Design & Creative", keys: ["design", "ui", "ux", "brand", "logo", "banner", "canvas", "artifact", "image", "video", "creative", "figma"] },
  { name: "Data & Analysis", keys: ["data", "analysis", "chart", "dataviz", "visualization", "research", "analytics", "sql", "csv"] },
  { name: "Writing & Content", keys: ["writing", "content", "blog", "copy", "seo", "marketing", "email", "summary", "translate"] },
  { name: "Automation & Workflow", keys: ["automation", "workflow", "agent", "orchestrat", "pipeline", "cron", "schedule", "deploy", "ci"] },
];

const catOf = (text) => categorize(text, SKILL_CATEGORIES);

/**
 * Resolve where a plugin's code actually lives.
 *
 * The manifest declares a per-plugin `source`, which we were discarding — so
 * all 297 plugins in the official marketplace were attributed to
 * anthropics/claude-plugins-official, inherited its 36,397 stars, and linked
 * there instead of to their own repo. Every one of those pages was stating
 * something false and reading as a near-duplicate of the other 296.
 *
 * Three shapes appear in the wild:
 *   "./plugins/foo"                          — a subdirectory of the marketplace
 *   { source: "url", url }                   — its own repository
 *   { source: "git-subdir", url, path, ref } — a subdirectory of another repo
 */
function resolveSource(plugin, marketplaceRepo) {
  const raw = plugin.source;

  if (typeof raw === "string") {
    const subdir = raw.replace(/^\.\//, "").replace(/\/+$/, "");
    return { repo: marketplaceRepo, subdir: subdir || null };
  }

  const url = raw?.url;
  const match = typeof url === "string" ? url.match(/github\.com\/([^/]+)\/([^/.]+)/i) : null;
  if (!match) return { repo: marketplaceRepo, subdir: null };

  const repo = `${match[1]}/${match[2]}`;
  const subdir = raw.source === "git-subdir" && raw.path ? String(raw.path).replace(/\/+$/, "") : null;
  return { repo, subdir, ref: raw.ref || null };
}

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
      const origin = resolveSource(p, repo);
      const sourceUrl = origin.subdir
        ? `https://github.com/${origin.repo}/tree/${origin.ref || "main"}/${origin.subdir}`
        : `https://github.com/${origin.repo}`;

      out.push({
        id: `skill:${slugify(repo + "-" + p.name)}`,
        name: p.name,
        slug: slugify(p.name),
        description: desc,
        category: catOf(`${p.name} ${desc}`),
        // The publisher, not whoever hosts the marketplace listing it.
        author: origin.repo.split("/")[0],
        skills: skillList.map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean),
        source,
        repo: origin.repo,
        subdir: origin.subdir,
        homepage: p.homepage || null,
        // Points at the plugin itself, including the subdirectory when it is
        // one folder inside a larger repository.
        sourceUrl,
        target: "claude",
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
  // Skills inherit the star count of the repo they ship in — it is the only
  // popularity signal available, and without it "Popular" cannot sort.
  // Each skill's OWN repo, so stars and maintenance reflect the plugin rather
  // than whichever marketplace happens to list it.
  await attachRepoMeta(all, (s) => `https://github.com/${s.repo}`);

  // The skill's own documentation. This is the only substantial unique text on
  // a skill page: without it they ran ~185 words at 86% word overlap with each
  // other, which is why Google crawled them and declined to index.
  await attachReadmes(
    all,
    (s) => s.repo,
    (s) => s.subdir ?? null,
  );

  log(`Skills total after dedupe: ${all.length}`);
  return all;
}
