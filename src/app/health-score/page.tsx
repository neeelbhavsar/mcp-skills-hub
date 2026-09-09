import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "How AI Library scores MCP server health: the exact components, weights and formula — and what the score deliberately does not measure.";

export const metadata: Metadata = {
  title: "How the health score works",
  description: DESCRIPTION,
  alternates: { canonical: "/health-score" },
  openGraph: {
    url: "/health-score",
    title: "How the health score works — AI Library",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const COMPONENTS = [
  {
    label: "Maintenance",
    weight: "30%",
    how: "Full marks for a commit within 30 days, decaying linearly to zero at two years. An archived repository scores zero outright.",
  },
  {
    label: "Adoption",
    weight: "20%",
    how: "GitHub stars and npm weekly downloads, each on a log curve (stars saturate at 2,000; downloads at 20,000) and averaged over whichever are available. Log scale because 10 → 100 users means more than 10,000 → 10,100.",
  },
  {
    label: "Transparency",
    weight: "20%",
    how: "Four equal checks: a public source repo, a declared license, documentation we could fetch, and a tool list the server would disclose.",
  },
  {
    label: "Provenance",
    weight: "15%",
    how: "Full marks for an official reference implementation, or for a package whose declared repository matches the registry entry. Half marks for a fork. Zero if there is no repo, or if the package and registry disagree about where the code lives.",
  },
  {
    label: "Packaging",
    weight: "15%",
    how: "Whether a stdio server pins a version (an unpinned install resolves to whatever is latest at launch), or a remote server documents its authentication. Zero for a deprecated package or an entry with nothing installable.",
  },
];

export default function HealthScorePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: "Health score", path: "/health-score" }])),
        }}
      />
      <PageHeader
        eyebrow="Methodology"
        title="How the health score"
        highlight="works"
        subtitle="Published in full, because a number you cannot audit is worse than no number at all."
      />

      <article className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-muted sm:px-6">
        <h2 className="text-base font-semibold text-foreground">The components</h2>
        <p className="mt-2">
          Each server is scored on five components. Every one is shown on the server&apos;s own page with its
          weight and the reason for its value, so you can disagree with any individual judgement.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs text-muted-2">
                <th className="py-2 pr-4 font-medium">Component</th>
                <th className="py-2 pr-4 font-medium">Weight</th>
                <th className="py-2 font-medium">How it is measured</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {COMPONENTS.map((c) => (
                <tr key={c.label} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium text-foreground">{c.label}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-brand-2">{c.weight}</td>
                  <td className="py-3">{c.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-base font-semibold text-foreground">The formula</h2>
        <p className="mt-2">
          Components are normalised to 0–1, multiplied by their weight, and divided by the weight actually
          measured — not the total:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-[var(--code-bg)] px-4 py-3 font-mono text-xs text-[var(--code-fg)]">
{`score = round(100 × Σ(value × weight) / Σ(weight of measured components))

grade  = A ≥ 80 · B ≥ 60 · C ≥ 40 · D < 40`}
        </pre>

        <h2 className="mt-10 text-base font-semibold text-foreground">
          Missing data is never a penalty
        </h2>
        <p className="mt-2">
          That denominator is the important part. If we could not resolve a server&apos;s repository, its
          maintenance component is excluded rather than scored zero — otherwise the score would punish
          servers for our own gaps in coverage. When less than half the weight is measurable we show{" "}
          <span className="text-foreground">no score at all</span> instead of a misleading one.
        </p>

        <h2 className="mt-10 text-base font-semibold text-foreground">What this does not measure</h2>
        <p className="mt-2">
          <span className="text-foreground">It is not a security audit.</span> Nothing here inspects the
          code. A server can score an A and still be malicious: a well-maintained, widely-installed,
          properly-licensed package is exactly what a competent attacker would publish. The score measures
          whether a project looks looked-after — not whether it is safe to trust with your credentials.
        </p>
        <p className="mt-3">
          It also cannot see runtime behaviour. What a server does with the data you send it is not
          observable from a registry entry, so read the tool list and the documentation before connecting
          anything that holds real credentials.
        </p>

        <h2 className="mt-10 text-base font-semibold text-foreground">Where the inputs come from</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Repository metadata: GitHub GraphQL API, daily.</li>
          <li>Package metadata: the npm registry, daily.</li>
          <li>Tool lists: read from the live server over MCP, daily.</li>
          <li>Everything else: the entry as published in the official MCP Registry.</li>
        </ul>

        <p className="mt-8 text-xs text-muted-2">
          Think a component is weighted wrong?{" "}
          <Link href="/submit" className="text-brand hover:underline">
            Tell us
          </Link>{" "}
          — the formula lives in <code className="font-mono">src/lib/health.ts</code> and is open to
          argument.
        </p>
      </article>
    </>
  );
}
