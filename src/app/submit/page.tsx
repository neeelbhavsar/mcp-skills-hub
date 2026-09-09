import type { Metadata } from "next";
import { ExternalLink, GitPullRequest, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Add an MCP server or Agent Skill to AI Library, report a wrong config, or argue with the health score.";

export const metadata: Metadata = {
  title: "Submit a resource",
  description: DESCRIPTION,
  alternates: { canonical: "/submit" },
  openGraph: { url: "/submit", title: "Submit a resource — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

const REPO = "https://github.com/neeelbhavsar/mcp-skills-hub";

/**
 * Submissions go through GitHub issues rather than a form.
 *
 * The site is statically generated with no backend, so there is nowhere to
 * POST to — and a prefilled issue is arguably better anyway: it is public,
 * threaded, and the submitter keeps visibility of what happens next.
 */
const ROUTES = [
  {
    title: "Add a resource",
    body: "Missing an MCP server or skill? The catalog is generated from public registries, so the fastest fix is usually publishing there — but tell us either way and we'll add the source.",
    label: "Open an issue",
    href: `${REPO}/issues/new?labels=submission&title=${encodeURIComponent("Add: ")}&body=${encodeURIComponent(
      "**Name:**\n\n**Repository or endpoint:**\n\n**What it does:**\n\n**Where is it published?** (MCP Registry / npm / GitHub only)\n",
    )}`,
    icon: Send,
  },
  {
    title: "Report a wrong config",
    body: "If a generated install snippet doesn't work in your client, that's the most important kind of bug here — the whole point is configs that work first time.",
    label: "Report it",
    href: `${REPO}/issues/new?labels=bad-config&title=${encodeURIComponent("Wrong config: ")}&body=${encodeURIComponent(
      "**Server page:**\n\n**Client:** (Claude Code / Cursor / VS Code / Windsurf / Cline / Codex)\n\n**What the site showed:**\n\n**What actually works:**\n\n**Error, if any:**\n",
    )}`,
    icon: GitPullRequest,
  },
  {
    title: "Challenge the health score",
    body: "The formula and every weight are published. If a component is weighted wrong, or a signal is misleading, say so — it lives in src/lib/health.ts and is open to argument.",
    label: "Start a discussion",
    href: `${REPO}/issues/new?labels=health-score&title=${encodeURIComponent("Health score: ")}&body=${encodeURIComponent(
      "**Server:**\n\n**Which component:** (maintenance / adoption / transparency / provenance / packaging)\n\n**Why the current treatment is wrong:**\n",
    )}`,
    icon: ExternalLink,
  },
];

export default function SubmitPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: "Submit", path: "/submit" }])),
        }}
      />
      <PageHeader
        eyebrow="Contribute"
        title="Something missing or"
        highlight="wrong?"
        subtitle="The catalog is generated from public registries and refreshed daily, so most gaps are upstream. These go straight to the repo."
      />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ul className="space-y-4">
          {ROUTES.map(({ title, body, label, href, icon: Icon }) => (
            <li key={title} className="rounded-2xl border border-border bg-surface/60 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Icon className="h-4 w-4 text-brand-2" />
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="ring-focus mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-brand/50"
              >
                {label} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs leading-relaxed text-muted-2">
          There is no submission form because there is no backend — the whole site is static files on a CDN.
          A prefilled GitHub issue is public and threaded, so you can see what happens to it.
        </p>
      </section>
    </>
  );
}
