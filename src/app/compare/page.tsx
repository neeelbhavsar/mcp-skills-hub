import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { mcps, getMcp } from "@/lib/data";
import { launchFor } from "@/lib/compat";
import { healthOf, requirementsOf } from "@/lib/health";
import { HealthPill } from "@/components/catalog/health-badge";
import { PageHeader } from "@/components/layout/page-header";
import { resourcePath, OG_IMAGE } from "@/lib/seo";
import { timeAgo } from "@/lib/utils";

const DESCRIPTION = "Put MCP servers side by side — transport, tools, credentials, maintenance and health.";

export const metadata: Metadata = {
  title: "Compare servers",
  description: DESCRIPTION,
  alternates: { canonical: "/compare" },
  openGraph: { url: "/compare", title: "Compare servers — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
  // A tool, not content: ?servers= admits a combinatorial number of near
  // duplicate URLs, which is pure crawl-budget waste. The bare /compare stays
  // crawlable so the feature is discoverable.
  robots: { index: false, follow: true },
};

// searchParams makes this route dynamic; it is a tool, not an indexable page.
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ servers?: string }>;
}) {
  const { servers } = await searchParams;
  const picked = (servers ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map(getMcp)
    .filter((m): m is NonNullable<typeof m> => !!m);

  if (picked.length < 2) {
    const suggestions = mcps.filter((m) => m.tools?.length).slice(0, 3);
    return (
      <>
        <PageHeader
          eyebrow="Compare"
          title="Put servers"
          highlight="side by side"
          subtitle="Pick two or more servers to diff their transport, tools, credentials and maintenance."
        />
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted">
            Select servers in the{" "}
            <Link href="/setup" className="text-brand hover:underline">
              setup builder
            </Link>{" "}
            and hit Compare, or pass slugs directly:
            {suggestions.length >= 2 && (
              <Link
                href={`/compare?servers=${suggestions.map((s) => s.slug).join(",")}`}
                className="mt-3 block font-mono text-xs text-brand hover:underline"
              >
                /compare?servers={suggestions.map((s) => s.slug).join(",")}
              </Link>
            )}
          </p>
        </section>
      </>
    );
  }

  const rows: { label: string; render: (m: (typeof picked)[number]) => React.ReactNode }[] = [
    {
      label: "Health",
      render: (m) => <HealthPill health={healthOf(m)} />,
    },
    {
      label: "Transport",
      render: (m) => {
        const l = launchFor(m);
        return l.mode === "remote" ? l.transport.toUpperCase() : l.mode === "stdio" ? "stdio (local)" : "—";
      },
    },
    {
      label: "Runs locally",
      render: (m) =>
        launchFor(m).mode === "stdio" ? (
          <Check className="h-4 w-4 text-warn" />
        ) : (
          <Minus className="h-4 w-4 text-muted-2" />
        ),
    },
    { label: "Tools listed", render: (m) => (m.tools?.length ? String(m.tools.length) : "not disclosed") },
    {
      label: "Credentials needed",
      render: (m) => {
        const r = requirementsOf(m);
        return r.required.length ? r.required.map((i) => i.name).join(", ") : "none declared";
      },
    },
    { label: "Auth", render: (m) => requirementsOf(m).authType?.label ?? "—" },
    { label: "Stars", render: (m) => (m.stars != null ? String(m.stars) : "—") },
    { label: "Last commit", render: (m) => (m.repoMeta?.pushedAt ? timeAgo(m.repoMeta.pushedAt) : "—") },
    { label: "License", render: (m) => m.repoMeta?.license ?? m.license ?? "—" },
    { label: "Category", render: (m) => m.category },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Compare"
        title="Side by"
        highlight="side"
        subtitle={picked.map((m) => m.name).join(" vs ")}
      />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/60">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-xs font-medium text-muted-2">&nbsp;</th>
                {picked.map((m) => (
                  <th key={m.slug} className="px-4 py-3">
                    <Link href={resourcePath("mcps", m.slug)} className="text-foreground hover:text-brand">
                      {m.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-2">{row.label}</td>
                  {picked.map((m) => (
                    <td key={m.slug} className="px-4 py-3 text-muted">
                      {row.render(m)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
