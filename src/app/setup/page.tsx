import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SetupBuilder } from "@/components/cart/setup-builder";
import { AI_TARGETS } from "@/lib/ai-targets";
import { CLIENT_GUIDES } from "@/lib/clients";
import { OG_IMAGE, SITE_URL, breadcrumbJsonLd, jsonLdScript, ogTitle } from "@/lib/seo";
import { STACKS, resolveStack } from "@/lib/stacks";

const DESCRIPTION =
  "Free MCP config generator: pick the MCP servers you want and get one merged config file for Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Cline or Codex — no hand-editing JSON.";

export const metadata: Metadata = {
  title: "MCP config generator — one file for every server",
  description: DESCRIPTION,
  alternates: { canonical: "/setup" },
  openGraph: { url: "/setup", title: ogTitle("MCP config generator"), description: DESCRIPTION, images: [OG_IMAGE] },
};

// Shared stacks arrive as /setup?servers=a,b,c. The canonical above collapses
// them onto /setup so a shared link never competes with the real page.

export default function SetupPage() {
  // Packs are resolved server-side so a curated slug that has left the
  // registry degrades to a keyword match instead of a dead entry.
  const packs = STACKS.map((s) => ({
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    servers: resolveStack(s).map((m) => m.slug),
  }));

  const jsonLd = [
    breadcrumbJsonLd([{ name: "Config generator", path: "/setup" }]),
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "MCP config generator",
      url: `${SITE_URL}/setup`,
      description: DESCRIPTION,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (runs in the browser)",
      isAccessibleForFree: true,
      featureList: AI_TARGETS.map((t) => `${t.name} config`).join(", "),
      provider: { "@id": `${SITE_URL}/#organization` },
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader
        eyebrow="Config generator"
        title="Configure every MCP server in"
        highlight="one file"
        subtitle="Tick servers as you browse the catalog. This page merges them into a single config for whichever client you use — including the mcp-remote bridges where your client needs them."
      />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <SetupBuilder packs={packs} />

        {/* Server-rendered explanation: the builder itself is client state,
            so without this the page had ~150 words a crawler could read. */}
        <div className="mt-12 space-y-4 text-sm leading-relaxed text-muted">
          <h2 className="text-base font-semibold text-foreground">How the generator works</h2>
          <p>
            Each MCP client stores servers in its own file and its own shape: Cursor and Claude Desktop use an{" "}
            <code>mcpServers</code> object, VS Code wants <code>servers</code> with an explicit <code>type</code>,
            Windsurf calls the remote URL <code>serverUrl</code>, and Codex uses TOML. The generator writes the
            right shape for the client you pick, and wraps remote servers in <code>mcp-remote</code> for clients
            that can only launch local processes.
          </p>
          <h2 className="pt-2 text-base font-semibold text-foreground">Where each file goes</h2>
          <ul className="space-y-1.5">
            {AI_TARGETS.map((t) => (
              <li key={t.id}>
                <Link href={`/clients/${t.id}`} className="text-brand hover:underline">
                  {t.name}
                </Link>
                : <code>{CLIENT_GUIDES[t.id]?.configFiles[0]?.path}</code>
              </li>
            ))}
          </ul>
          <p>
            Your selection is kept in this browser only. Share it with the &ldquo;Share this stack&rdquo; button,
            which encodes it in the URL — nothing is sent to a server.
          </p>
        </div>
      </section>
    </>
  );
}
