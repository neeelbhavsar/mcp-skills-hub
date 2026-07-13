"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Star, X, GitFork } from "lucide-react";
import type { CardItem } from "@/lib/view";
import type { Mcp, Repo, Skill } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AiUsage } from "./ai-usage";
import { formatStars } from "@/lib/utils";

export function DetailDialog({ item, onClose }: { item: CardItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            className="glass-strong relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border/70 p-5">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{item.category}</Badge>
                  {item.pills.slice(0, 2).map((p) => (
                    <Badge key={p.label} tone={p.tone}>{p.label}</Badge>
                  ))}
                </div>
                <h2 className="truncate text-xl font-semibold capitalize">{item.title}</h2>
                <p className="mt-1 text-xs text-muted-2">{item.footer}</p>
              </div>
              <button
                onClick={onClose}
                className="ring-focus rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm leading-relaxed text-muted">{item.description}</p>

              <KindExtras item={item} />

              <div className="mt-6 flex flex-wrap gap-2">
                {item.externalUrl && item.externalUrl !== "#" && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-brand/50"
                  >
                    {item.kind === "repos" ? <GitFork className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                    {item.kind === "repos" ? "View on GitHub" : "Source"}
                  </a>
                )}
                {item.stars != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted">
                    <Star className="h-4 w-4 text-warn" /> {formatStars(item.stars)}
                  </span>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold">
                  How to use this in <span className="text-gradient">your AI</span>
                </h3>
                <p className="mt-1 mb-4 text-xs text-muted-2">Pick your assistant — copy-paste ready.</p>
                <AiUsage item={item} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KindExtras({ item }: { item: CardItem }) {
  if (item.kind === "mcps") {
    const m = item.raw as Mcp;
    if (!m.tools?.length) return null;
    return (
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-2">Exposed tools</p>
        <div className="flex flex-wrap gap-1.5">
          {m.tools.slice(0, 10).map((t) => (
            <span key={t} className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-brand-2">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (item.kind === "skills") {
    const s = item.raw as Skill;
    if (!s.skills.length) return null;
    return (
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-2">Included skills</p>
        <div className="flex flex-wrap gap-1.5">
          {s.skills.map((sk) => (
            <span key={sk} className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-accent">
              {sk.replace(/^\.\/skills\//, "")}
            </span>
          ))}
        </div>
      </div>
    );
  }
  const r = item.raw as Repo;
  if (item.kind === "repos" && r.topics?.length) {
    return (
      <div className="mt-4 flex flex-wrap gap-1.5">
        {r.topics.map((t) => (
          <span key={t} className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-muted">
            #{t}
          </span>
        ))}
      </div>
    );
  }
  return null;
}
