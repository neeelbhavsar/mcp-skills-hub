"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AI_TARGETS, mcpUsage, skillUsage, repoUsage, type UsageStep } from "@/lib/ai-targets";
import type { CardItem } from "@/lib/view";
import type { Skill, Mcp, Repo } from "@/lib/types";
import { CodeBlock } from "@/components/fx/code-block";
import { cn } from "@/lib/utils";

function stepsFor(item: CardItem, aiId: string): UsageStep[] {
  if (item.kind === "mcps") return mcpUsage(item.raw as Mcp, aiId);
  if (item.kind === "skills") return skillUsage(item.raw as Skill, aiId);
  return repoUsage(item.raw as Repo, aiId);
}

export function AiUsage({ item }: { item: CardItem }) {
  const [active, setActive] = useState(AI_TARGETS[0].id);
  const target = AI_TARGETS.find((t) => t.id === active)!;
  const steps = stepsFor(item, active);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {AI_TARGETS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "ring-focus flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                on ? "border-transparent text-white" : "border-border text-muted hover:text-foreground",
              )}
              style={on ? { background: `linear-gradient(100deg, ${t.color}, ${t.color}cc)` } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: on ? "#fff" : t.color }}
              />
              {t.name}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4"
        >
          <p className="mb-3 text-xs text-muted-2">
            <span className="text-muted">{target.name}</span> — {target.blurb}
          </p>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-semibold text-brand-2">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{step.label}</p>
                  {step.code && (
                    <CodeBlock code={step.code} language={step.language} className="mt-2" />
                  )}
                  {step.note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
