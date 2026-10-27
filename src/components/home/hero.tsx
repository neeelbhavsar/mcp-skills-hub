import Link from "next/link";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Aurora } from "@/components/fx/aurora";
import { StatCounter } from "./stat-counter";
import { ToolMarquee } from "./marquee";

/**
 * Server-rendered and painted from the first frame. Every block here used to
 * start at opacity 0 and fade in after hydration, so the H1 — the page's LCP
 * element — waited on JavaScript, and the first frame on mobile was empty.
 * The CSS `animate-rise` only moves content; it never hides it.
 */
export function Hero({
  counts,
  updatedLabel,
}: {
  counts: { skills: number; mcps: number; repos: number };
  updatedLabel: string;
}) {
  const total = counts.skills + counts.mcps + counts.repos;

  return (
    <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28">
      <Aurora />
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        {/* The freshness claim, stated with its numbers: the strongest proof
            that the directory is alive. */}
        <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted backdrop-blur">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span>
            <span className="font-semibold text-foreground">{total.toLocaleString("en-US")} resources</span> ·
            updated daily · last refresh {updatedLabel}
          </span>
        </p>

        <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Every MCP server &amp; Agent Skill,<br className="hidden sm:block" /> ready to{" "}
          <span className="text-gradient">paste into your AI</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          MCP Skills Hub is a daily-refreshed directory of MCP servers, Agent Skills and GitHub repos for Claude,
          Cursor, Codex, Windsurf, VS Code and Cline — with the exact config each client needs, health scores, and
          the tools every server exposes.
        </p>

        <div className="animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/mcps"
            className="ring-focus group inline-flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Browse MCP servers
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/best-mcp-servers"
            className="ring-focus inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-brand/50 sm:w-auto"
          >
            <Zap className="h-4 w-4 text-accent" aria-hidden />
            Best MCP servers
          </Link>
        </div>

        <div className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-2 rounded-2xl border border-border bg-surface/40 p-4 backdrop-blur sm:gap-4 sm:p-6">
          <StatCounter value={counts.mcps} label="MCP Servers" />
          <StatCounter value={counts.skills} label="Skills" />
          <StatCounter value={counts.repos} label="Repos" />
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        <p className="mb-2 text-center text-xs uppercase tracking-widest text-muted">Works with every assistant</p>
        <ToolMarquee />
      </div>
    </section>
  );
}
