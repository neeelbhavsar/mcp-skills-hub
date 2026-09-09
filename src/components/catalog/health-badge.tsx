import Link from "next/link";
import { Activity, HelpCircle } from "lucide-react";
import type { Health } from "@/lib/health";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<string, string> = {
  A: "text-accent border-accent/40 bg-accent/10",
  B: "text-brand-2 border-brand-2/40 bg-brand-2/10",
  C: "text-warn border-warn/40 bg-warn/10",
  D: "text-danger border-danger/40 bg-danger/10",
};

/** Compact grade pill for cards and page headers. */
export function HealthPill({ health, className }: { health: Health; className?: string }) {
  if (health.score === null) {
    return (
      <span
        title="Not enough data to score this server"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-2",
          className,
        )}
      >
        <HelpCircle className="h-3 w-3" />
        No score
      </span>
    );
  }

  return (
    <span
      title={`Health ${health.score}/100 (grade ${health.grade})`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        GRADE_STYLE[health.grade ?? "C"],
        className,
      )}
    >
      {health.grade} · {health.score}
    </span>
  );
}

/**
 * The full breakdown. Every component is shown with its weight and the reason
 * for its value, because a score you cannot audit is worse than no score —
 * the reader can't tell a genuinely risky server from one we simply couldn't
 * measure.
 */
export function HealthPanel({ health }: { health: Health }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Activity className="h-4 w-4 text-brand" />
        Health score
        <HealthPill health={health} className="ml-1" />
      </h2>
      <p className="mt-1 mb-4 text-xs text-muted-2">
        Maintenance, adoption, transparency and packaging — not a safety audit.{" "}
        <Link href="/health-score" className="text-brand hover:underline">
          How this is calculated
        </Link>
      </p>

      {health.score === null && (
        <p className="mb-4 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted">
          Only {Math.round(health.coverage * 100)}% of the inputs could be measured for this server, which
          is too little for a meaningful score. The components below show what is known.
        </p>
      )}

      <ul className="space-y-2.5">
        {health.components.map((c) => {
          const pct = c.value === null ? null : Math.round(c.value * 100);
          return (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-foreground">
                  {c.label}
                  <span className="ml-1.5 text-xs text-muted-2">{c.weight}%</span>
                </span>
                <span className={cn("text-xs", pct === null ? "text-muted-2" : "text-muted")}>
                  {pct === null ? "not measurable" : `${pct}%`}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                {pct !== null && (
                  <div
                    className={cn(
                      "h-full rounded-full",
                      pct >= 70 ? "bg-accent" : pct >= 40 ? "bg-warn" : "bg-danger",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-2">{c.detail}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
