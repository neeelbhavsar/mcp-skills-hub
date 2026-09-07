import { AlertTriangle, CheckCircle2, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Mcp } from "@/lib/types";
import { accessSummary, overallLevel, trustSignals, type Level } from "@/lib/trust";
import { AI_TARGETS } from "@/lib/ai-targets";
import { supportMatrix, type Support } from "@/lib/compat";
import { cn } from "@/lib/utils";

const LEVEL_STYLE: Record<Level, { icon: typeof Info; className: string }> = {
  good: { icon: CheckCircle2, className: "text-accent" },
  caution: { icon: AlertTriangle, className: "text-warn" },
  risk: { icon: ShieldAlert, className: "text-danger" },
  neutral: { icon: Info, className: "text-muted-2" },
};

const SUPPORT_STYLE: Record<Support, { label: string; className: string }> = {
  native: { label: "Native", className: "text-accent border-accent/40 bg-accent/10" },
  bridged: { label: "Via mcp-remote", className: "text-warn border-warn/40 bg-warn/10" },
  unsupported: { label: "Unavailable", className: "text-danger border-danger/40 bg-danger/10" },
};

/**
 * What this server is and what it can reach.
 *
 * Installing an MCP server means either running someone's code locally or
 * handing a third party your requests. These are stated as plain signals, not
 * a score or a safety verdict — none of them proves anything on its own, and
 * pretending otherwise would be worse than saying nothing.
 */
export function TrustPanel({ mcp }: { mcp: Mcp }) {
  const signals = trustSignals(mcp);
  const access = accessSummary(mcp);
  const level = overallLevel(signals);
  const matrix = supportMatrix(mcp, AI_TARGETS);

  const Headline = level === "risk" ? ShieldAlert : level === "caution" ? AlertTriangle : ShieldCheck;

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Headline className={cn("h-4 w-4", LEVEL_STYLE[level].className)} />
        Before you install
      </h2>
      <p className="mt-1 mb-4 text-xs text-muted-2">
        Signals gathered from the source repo and package registry — not a safety verdict.
      </p>

      {access.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-surface/60 p-4">
          <p className="mb-2 text-xs font-medium text-muted-2">What it can reach</p>
          <ul className="space-y-2">
            {access.map((a) => (
              <li key={a.label} className="text-sm">
                <span className="text-foreground">{a.label}</span>
                <span className="text-muted"> — {a.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-2">
        {signals.map((s, i) => {
          const { icon: Icon, className } = LEVEL_STYLE[s.level];
          return (
            <li key={`${s.label}-${i}`} className="flex gap-2.5 text-sm">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", className)} />
              <span className="min-w-0">
                <span className="text-foreground">{s.label}</span>
                <span className="text-muted"> — {s.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-muted-2">Client compatibility</p>
        <div className="flex flex-wrap gap-1.5">
          {matrix.map((c) => (
            <span
              key={c.id}
              title={c.reason}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                SUPPORT_STYLE[c.support].className,
              )}
            >
              {c.name}: {SUPPORT_STYLE[c.support].label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
