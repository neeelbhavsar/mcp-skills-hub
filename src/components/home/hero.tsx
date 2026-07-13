"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Aurora } from "@/components/fx/aurora";
import { StatCounter } from "./stat-counter";
import { ToolMarquee } from "./marquee";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero({
  counts,
  updatedLabel,
}: {
  counts: { skills: number; mcps: number; repos: number };
  updatedLabel: string;
}) {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28">
      <Aurora />
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Auto-refreshed daily · updated {updatedLabel}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
          className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          Every AI Skill, MCP<br className="hidden sm:block" /> &amp; Repo in{" "}
          <span className="text-gradient">one library</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg"
        >
          Discover skills, MCP servers and the best GitHub repos for Claude, Cursor, Codex and every
          other assistant — with copy-paste setup for each one. The all-in-one launchpad for AI-native
          developers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.19 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/mcps"
            className="ring-focus group inline-flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            Explore the Library
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/skills"
            className="ring-focus inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-brand/50 sm:w-auto"
          >
            <Zap className="h-4 w-4 text-accent" />
            Browse Skills
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.28 }}
          className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4 rounded-2xl border border-border bg-surface/40 p-6 backdrop-blur"
        >
          <StatCounter value={counts.skills} label="Skills" suffix="+" />
          <StatCounter value={counts.mcps} label="MCP Servers" suffix="+" />
          <StatCounter value={counts.repos} label="Repos" suffix="+" />
        </motion.div>
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        <p className="mb-2 text-center text-xs uppercase tracking-widest text-muted-2">
          Works with every assistant
        </p>
        <ToolMarquee />
      </div>
    </section>
  );
}
