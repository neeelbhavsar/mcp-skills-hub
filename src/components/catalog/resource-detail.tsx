import Link from "next/link";
import { AlertTriangle, ArrowLeft, ExternalLink, GitFork, ShieldAlert, Star } from "lucide-react";
import type { CardItem } from "@/lib/view";
import { repoToCard, skillToCard } from "@/lib/view";
import type { Mcp, Repo, Skill } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AiUsage } from "./ai-usage";
import { ResourceExtras } from "./resource-extras";
import { TrustPanel } from "./trust-panel";
import { InstallButtons } from "./install-buttons";
import { AddToSetup } from "@/components/cart/add-to-setup";
import { ToolsPanel, RequirementsPanel } from "./tools-panel";
import { CapabilityPanel } from "./capability-panel";
import { HealthPanel, HealthPill } from "./health-badge";
import { ReadmeViewer } from "./readme-viewer";
import { CopyAsPrompt } from "./copy-as-prompt";
import { AlternativesPanel } from "./alternatives-panel";
import { ResourceCard } from "./resource-card";
import { healthOf, requirementsOf } from "@/lib/health";
import { maintenanceWarning } from "@/lib/trust";
import { installPrompt } from "@/lib/ai-targets";
import { alternativesTo, meta, relatedRepos, relatedSkills } from "@/lib/data";
import { mcpGlance, skillGlance } from "@/lib/glance";
import { CodeBlock } from "@/components/fx/code-block";
import { usagePanels } from "@/lib/usage-panels";
import { formatStars, timeAgo } from "@/lib/utils";
import { KIND_META, SITE_URL, absoluteUrl, breadcrumbJsonLd, jsonLdScript, resourcePath } from "@/lib/seo";

/** Registry page for a package, which is where it is actually downloaded from. */
function downloadUrlOf(mcp: Mcp): string | null {
  const pkg = mcp.packages[0];
  if (!pkg) return null;
  const reg = (pkg.registryType ?? "").toLowerCase();
  if (reg === "npm") return `https://www.npmjs.com/package/${pkg.identifier}`;
  if (reg === "pypi") return `https://pypi.org/project/${pkg.identifier}/`;
  return null;
}

/** Publisher of a registry entry, from its namespace: "io.github.acme/x" → acme. */
function publisherOf(mcp: Mcp): string | null {
  if (mcp.source === "Official reference") return "Model Context Protocol";
  const ns = mcp.qualifiedName.split("/")[0] ?? "";
  if (ns.startsWith("io.github.")) return ns.slice("io.github.".length);
  return ns.includes(".") ? ns.split(".").reverse().join(".") : null;
}

const GITHUB = /^https:\/\/github\.com\//;

/**
 * schema.org wants a license as a URL (or CreativeWork); bare SPDX ids like
 * "MIT" were emitted as text. SPDX publishes a stable page per identifier.
 */
function licenseUrl(id: string | null | undefined) {
  if (!id || /^(noassertion|other|none)$/i.test(id) || !/^[A-Za-z0-9.+-]+$/.test(id)) return undefined;
  return `https://spdx.org/licenses/${id}.html`;
}

/** schema.org node describing the resource itself. */
function itemJsonLd(item: CardItem) {
  const path = resourcePath(item.kind, item.slug);
  const url = absoluteUrl(path);
  const base = {
    "@context": "https://schema.org",
    "@id": `${url}#resource`,
    name: item.title,
    description: item.description,
    url,
    mainEntityOfPage: url,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    applicationSubCategory: item.category,
    ...(item.updatedAt ? { dateModified: item.updatedAt } : {}),
  };

  if (item.kind === "repos") {
    const r = item.raw as Repo;
    return {
      ...base,
      "@type": "SoftwareSourceCode",
      codeRepository: r.url,
      // The GitHub repo is the same entity as this page's subject.
      sameAs: r.url,
      author: { "@type": "Person", name: r.owner, url: `https://github.com/${r.owner}` },
      ...(r.topics.length ? { keywords: r.topics.join(", ") } : {}),
      ...(r.language ? { programmingLanguage: r.language } : {}),
      ...(licenseUrl(r.license) ? { license: licenseUrl(r.license) } : {}),
    };
  }

  if (item.kind === "skills") {
    const s = item.raw as Skill;
    return {
      ...base,
      "@type": "SoftwareApplication",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      author: { "@type": "Person", name: s.author },
      ...(GITHUB.test(s.sourceUrl) ? { downloadUrl: s.sourceUrl } : {}),
      ...(licenseUrl(s.repoMeta?.license) ? { license: licenseUrl(s.repoMeta?.license) } : {}),
      ...(s.repoMeta?.pushedAt ? { dateModified: s.repoMeta.pushedAt } : {}),
      // Skills are files in a public repo: free to use is a verifiable fact.
      isAccessibleForFree: true,
    };
  }

  const m = item.raw as Mcp;
  const pkg = m.packages[0];
  const publisher = publisherOf(m);
  const download = downloadUrlOf(m);
  // The first usable one: GitHub reports "NOASSERTION" for repos it can't
  // classify, which used to win over the package's own valid license.
  const license = [m.repoMeta?.license, m.license].find((l) => licenseUrl(l)) ?? null;
  return {
    ...base,
    "@type": "SoftwareApplication",
    applicationCategory: "DeveloperApplication",
    operatingSystem: m.packages.length ? "Windows, macOS, Linux" : "Any",
    ...(publisher ? { author: { "@type": "Organization", name: publisher } } : {}),
    ...(pkg ? { softwareVersion: pkg.version && pkg.version !== "latest" ? pkg.version : undefined } : {}),
    ...(download ? { downloadUrl: download } : {}),
    ...(licenseUrl(license) ? { license: licenseUrl(license) } : {}),
    ...(m.tools?.length ? { featureList: m.tools.slice(0, 20).map((t) => t.name).join(", ") } : {}),
    // Only claim "free" where it is verifiable: an openly licensed package.
    // Hosted services may well charge, and the registry does not say.
    ...(download && license ? { offers: { "@type": "Offer", price: 0, priceCurrency: "USD" } } : {}),
  };
}

/** A copy of the record without the heavy fields a client panel doesn't read. */
function without(m: Mcp, ...keys: ("readme" | "inspection" | "tools")[]): Mcp {
  const copy = { ...m };
  for (const k of keys) delete copy[k];
  return copy;
}

export function ResourceDetail({ item }: { item: CardItem }) {
  const kind = KIND_META[item.kind];
  const mcp = item.kind === "mcps" ? (item.raw as Mcp) : null;
  // Skills and repos carry their own documentation now, which is the only
  // substantial unique text on those pages.
  const skill = item.kind === "skills" ? (item.raw as Skill) : null;
  const repo = item.kind === "repos" ? (item.raw as Repo) : null;
  const warning = mcp ? maintenanceWarning(mcp) : null;
  const alternatives = mcp ? alternativesTo(mcp) : [];
  const related = repo ? relatedRepos(repo) : [];
  const similarSkills = skill ? relatedSkills(skill) : [];
  const glance = mcp ? mcpGlance(mcp, meta.updatedAt) : skill ? skillGlance(skill, meta.updatedAt) : null;
  const pagePath = resourcePath(item.kind, item.slug);
  const updated = item.updatedAt ?? (skill?.repoMeta?.pushedAt || null);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: kind.label, path: kind.path },
      { name: item.title, path: resourcePath(item.kind, item.slug) },
    ]),
    itemJsonLd(item),
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-muted">
        <Link href="/" className="inline-flex min-h-11 items-center px-1 hover:text-foreground">Home</Link>
        <span aria-hidden>/</span>
        <Link href={kind.path} className="inline-flex min-h-11 items-center px-1 hover:text-foreground">{kind.label}</Link>
        <span aria-hidden>/</span>
        <span className="truncate px-1" aria-current="page">{item.title}</span>
      </nav>

      <Link
        href={kind.path}
        className="ring-focus mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All {kind.label}
      </Link>

      {/* An abandoned project is the first thing a reader should know, not a
          line buried among the trust signals further down. */}
      {warning && (
        <div
          role="note"
          className={
            warning.level === "risk"
              ? "mb-6 flex gap-3 rounded-xl border border-danger/40 bg-danger/5 px-4 py-3"
              : "mb-6 flex gap-3 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3"
          }
        >
          {warning.level === "risk" ? (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
          )}
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{warning.title}.</span> {warning.detail}
            {alternatives.length > 0 && (
              <>
                {" "}
                <a href="#alternatives" className="text-brand hover:underline">
                  See {alternatives.length} alternative{alternatives.length === 1 ? "" : "s"}
                </a>
                .
              </>
            )}
          </p>
        </div>
      )}

      <header>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="brand" className="capitalize">{item.category}</Badge>
          {item.pills.slice(0, 3).map((p) => (
            <Badge key={p.label} tone={p.tone}>{p.label}</Badge>
          ))}
          {mcp && <HealthPill health={healthOf(mcp)} />}
        </div>
        {/* Says what the page is, not just the name: "Filesystem" alone
            matched nothing people search for. */}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {item.title}
          {mcp && !/\bmcp\b/i.test(item.title) && <span className="text-muted"> MCP server</span>}
          {skill && !/\bskills?\b/i.test(item.title) && <span className="text-muted"> — Agent Skill</span>}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {item.footer}
          {updated && (
            <>
              {" · "}Updated <time dateTime={updated}>{timeAgo(updated)}</time>
            </>
          )}
        </p>
      </header>

      <p className="mt-5 text-base leading-relaxed text-muted">{item.description}</p>

      {glance && (
        <section aria-labelledby="at-a-glance" className="mt-5 rounded-xl border border-border bg-surface/60 px-4 py-3">
          <h2 id="at-a-glance" className="text-xs font-medium uppercase tracking-wide text-muted">
            At a glance
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{glance}</p>
        </section>
      )}

      {repo && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {repo.fullName} is a {repo.language ? `${repo.language} ` : ""}repository in the {repo.category} category
          with {repo.stars.toLocaleString("en-US")} stars and {repo.forks.toLocaleString("en-US")} forks on GitHub
          {repo.license ? `, released under the ${repo.license} license` : ""}
          {repo.updatedAt ? `, last updated ${timeAgo(repo.updatedAt)}` : ""}.
        </p>
      )}

      <ResourceExtras item={item} />

      <div className="mt-6 flex flex-wrap gap-2">
        {item.externalUrl && item.externalUrl !== "#" && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="ring-focus inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground transition-colors hover:border-brand/50"
          >
            {item.kind === "repos" ? <GitFork className="h-4 w-4" aria-hidden /> : <ExternalLink className="h-4 w-4" aria-hidden />}
            {item.kind === "repos" ? "View on GitHub" : "Source"}
          </a>
        )}
        {item.stars != null && (
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted">
            <Star className="h-4 w-4 text-warn" aria-hidden /> {formatStars(item.stars)}
            <span className="sr-only">GitHub stars</span>
          </span>
        )}
        {mcp && <AddToSetup slug={item.slug} variant="full" className="min-h-11" />}
        {mcp && <CopyAsPrompt prompt={installPrompt(mcp)} />}
      </div>

      {mcp && <InstallButtons mcp={mcp} />}

      <section id="install" className="mt-10 scroll-mt-20">
        <h2 className="text-base font-semibold">
          How to install {item.title} in <span className="text-gradient">your AI client</span>
        </h2>
        <p className="mt-1 mb-4 text-xs text-muted">
          Setup for Claude Code, Claude Desktop, Cursor, Codex, Windsurf, Cline and VS Code — copy-paste ready.
        </p>
        <AiUsage title={item.title} panels={usagePanels(item)} />
      </section>

      {mcp && <RequirementsPanel mcp={{ name: mcp.name, packages: mcp.packages }} requirements={requirementsOf(mcp)} />}
      {mcp && (
        <ToolsPanel
          mcp={{ name: mcp.name, tools: mcp.tools, toolsStatus: mcp.toolsStatus, toolsSource: mcp.toolsSource, packages: mcp.packages }}
        />
      )}
      {mcp && <CapabilityPanel mcp={without(mcp, "readme", "tools")} />}
      {mcp && <TrustPanel mcp={mcp} />}
      {mcp && <HealthPanel health={healthOf(mcp)} />}
      {mcp?.readme && <ReadmeViewer readme={mcp.readme} />}
      {skill?.readme && <ReadmeViewer readme={skill.readme} />}
      {repo?.readme && <ReadmeViewer readme={repo.readme} />}
      {mcp && (
        <div id="alternatives" className="scroll-mt-20">
          <AlternativesPanel current={mcp} alternatives={alternatives} />
        </div>
      )}

      {similarSkills.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">More {skill!.category} skills</h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {similarSkills.map((sk) => (
              <li key={sk.id}>
                <ResourceCard item={skillToCard(sk)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mcp && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Maintain {item.title}? Add a badge to your README</h2>
          <p className="mt-1 mb-3 text-xs text-muted">
            Shows its health grade, and links readers to install steps for every client.
          </p>
          <CodeBlock
            language="markdown"
            code={`[![${item.title} on MCP Skills Hub](${absoluteUrl(`/badge/${item.slug}`)})](${absoluteUrl(pagePath)})`}
          />
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">More {repo!.category} repositories</h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.id}>
                <ResourceCard item={repoToCard(r)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 text-xs text-muted">
        Catalog data refreshed{" "}
        <time dateTime={meta.updatedAt}>
          {new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </time>
        . Something wrong?{" "}
        <Link href="/submit" className="text-brand hover:underline">
          Report it
        </Link>
        .
      </p>
    </article>
  );
}
