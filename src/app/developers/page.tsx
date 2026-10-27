import type { Metadata } from "next";
import Link from "next/link";
import { meta } from "@/lib/data";
import { CodeBlock } from "@/components/fx/code-block";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE, SITE_NAME, SITE_URL, breadcrumbJsonLd, jsonLdScript, ogTitle } from "@/lib/seo";

const DESCRIPTION = `The ${SITE_NAME} catalog as JSON — every MCP server, Agent Skill and repo with install configs, health scores and tools — plus an MCP server so your assistant can search it directly.`;

export const metadata: Metadata = {
  title: "API & MCP server for developers",
  description: DESCRIPTION,
  alternates: { canonical: "/developers" },
  openGraph: { url: "/developers", title: ogTitle("API & MCP server"), description: DESCRIPTION, images: [OG_IMAGE] },
};

const ENDPOINTS = [
  { path: "/api/mcps", what: "Every MCP server: launch config, generated config key, health score, trust signals, credentials and tools." },
  { path: "/api/skills", what: "Every Agent Skill: source repo, author, included skills and stars." },
  { path: "/api/repos", what: "Every GitHub repo: stars, language, topics and license." },
  { path: "/openapi.json", what: "OpenAPI 3.1 description of the endpoints above." },
  { path: "/.well-known/api-catalog", what: "RFC 9727 API catalog, for automated discovery." },
  { path: "/llms.txt", what: "A plain-text map of the site for language models." },
  { path: "/feed.xml", what: "RSS feed of new, removed and trending entries." },
];

export default function DevelopersPage() {
  const jsonLd = [
    breadcrumbJsonLd([{ name: "Developers", path: "/developers" }]),
    {
      "@context": "https://schema.org",
      "@type": "WebAPI",
      name: `${SITE_NAME} catalog API`,
      description: DESCRIPTION,
      url: `${SITE_URL}/developers`,
      documentation: `${SITE_URL}/openapi.json`,
      provider: { "@id": `${SITE_URL}/#organization` },
      isAccessibleForFree: true,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader eyebrow="Developers" title="The catalog as" highlight="data" subtitle={DESCRIPTION} />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section>
          <h2 className="text-lg font-semibold">JSON API</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Read-only, no key, CORS open, regenerated with every daily refresh (last:{" "}
            {new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            ). If you build on it, a link back to {SITE_NAME} is appreciated.
          </p>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/60">
            {ENDPOINTS.map((e) => (
              <li key={e.path} className="px-4 py-3">
                <a href={e.path} className="font-mono text-sm text-brand hover:underline">
                  {e.path}
                </a>
                <p className="mt-1 text-sm text-muted">{e.what}</p>
              </li>
            ))}
          </ul>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`curl -s ${SITE_URL}/api/mcps | jq '.servers[] | select(.health.grade == "A") | .name'`}
          />
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">MCP server</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            An MCP server that searches this directory, so your assistant can find a server by what it does and
            hand back its install config without leaving the conversation. Tools: <code>search_mcp_servers</code>,{" "}
            <code>search_skills</code>, <code>search_tools</code> and <code>get_install_config</code>. Zero
            dependencies; source in the{" "}
            <a
              href="https://github.com/neeelbhavsar/mcp-skills-hub/tree/main/mcp-server"
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              repository
            </a>
            .
          </p>
          <CodeBlock className="mt-4" language="bash" code="claude mcp add mcp-skills-hub -- npx -y mcp-skills-hub" />
          <p className="mt-2 text-xs text-muted">
            Until it is on npm, run it from a clone: <code>node /path/to/mcp-server/index.mjs</code>.
          </p>
        </section>

        <p className="mt-10 text-sm text-muted">
          Something missing from the API?{" "}
          <Link href="/submit" className="text-brand hover:underline">
            Open an issue
          </Link>
          .
        </p>
      </article>
    </>
  );
}
