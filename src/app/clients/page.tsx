import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { AI_TARGETS } from "@/lib/ai-targets";
import { CLIENT_GUIDES } from "@/lib/clients";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE, breadcrumbJsonLd, jsonLdScript, ogTitle } from "@/lib/seo";

const DESCRIPTION =
  "How to add an MCP server to Claude Code, Claude Desktop, Cursor, Codex, Windsurf, Cline and VS Code — where each config file lives, the format it expects, and how to fix the usual errors.";

export const metadata: Metadata = {
  title: "MCP setup guides for every AI client",
  description: DESCRIPTION,
  alternates: { canonical: "/clients" },
  openGraph: { url: "/clients", title: ogTitle("MCP setup guides"), description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function ClientsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd([{ name: "Setup guides", path: "/clients" }])) }}
      />
      <PageHeader
        eyebrow="Setup guides"
        title="Add an MCP server to"
        highlight="any AI client"
        subtitle="Every client stores MCP servers somewhere different, in a slightly different shape. These guides say exactly where and how — and what to do when it doesn't work."
      />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2">
          {AI_TARGETS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/clients/${t.id}`}
                className="ring-focus group flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-5 transition-colors hover:border-brand/50"
              >
                <BookOpen className="mb-3 h-5 w-5" style={{ color: t.color }} aria-hidden />
                <span className="text-base font-semibold text-foreground">How to add an MCP server to {t.name}</span>
                <span className="mt-1.5 flex-1 text-sm text-muted">{CLIENT_GUIDES[t.id]?.intro}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-brand">
                  Read the guide
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
