import Link from "next/link";
import { Shuffle } from "lucide-react";
import type { Mcp } from "@/lib/types";
import { resourcePath } from "@/lib/seo";
import { healthOf } from "@/lib/health";
import { HealthPill } from "./health-badge";

/**
 * Other servers that do a similar job. Ranked mostly by overlapping tool
 * names, which is a far better similarity signal than category — two servers
 * exposing `search_docs` really are substitutes.
 */
export function AlternativesPanel({ current, alternatives }: { current: Mcp; alternatives: Mcp[] }) {
  if (alternatives.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Shuffle className="h-4 w-4 text-brand-2" />
        Alternatives to {current.name}
      </h2>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/60">
        {alternatives.map((alt) => (
          <li key={alt.slug}>
            <Link
              href={resourcePath("mcps", alt.slug)}
              className="ring-focus flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{alt.name}</span>
                  <HealthPill health={healthOf(alt)} />
                </span>
                <span className="mt-0.5 block line-clamp-2 text-xs text-muted">{alt.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
