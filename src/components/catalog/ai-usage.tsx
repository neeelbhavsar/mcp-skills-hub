"use client";

import { useId, useRef, useState } from "react";
import { Check, ClipboardList } from "lucide-react";
import type { UsageStep } from "@/lib/ai-targets";
import { CodeBlock } from "@/components/fx/code-block";
import { cn } from "@/lib/utils";

/** One client's tab, precomputed on the server (see usage-panels.ts). */
export interface UsagePanel {
  id: string;
  name: string;
  blurb: string;
  color: string;
  steps: UsageStep[];
  bundle: string;
}

/**
 * Per-client install steps, as an ARIA tab set.
 *
 * Every client's panel is rendered into the HTML, with only the active one
 * visible. Previously only the active tab existed, so the server HTML held
 * the Claude Code steps and nothing else: "how do I install X in Cursor" was
 * unanswerable from any page, for search engines and AI answer engines alike.
 */
export function AiUsage({ title, panels }: { title: string; panels: UsagePanel[] }) {
  // Steps arrive precomputed: passing the CardItem here serialized the whole
  // raw source object (README, tool schemas, inspection) into the page.
  const [active, setActive] = useState(panels[0].id);
  const [copied, setCopied] = useState<string | null>(null);
  const base = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  async function copyAll(id: string, bundle: string) {
    try {
      await navigator.clipboard.writeText(bundle);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  function onTabKey(e: React.KeyboardEvent, index: number) {
    const last = panels.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(panels[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="AI client" className="flex flex-wrap gap-2">
        {panels.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                "ring-focus flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-all",
                on ? "border-transparent text-white" : "border-border text-muted hover:text-foreground",
              )}
              style={on ? { background: `linear-gradient(100deg, ${t.color}, ${t.color}cc)` } : undefined}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: on ? "#fff" : t.color }}
              />
              {t.name}
            </button>
          );
        })}
      </div>

      {panels.map((target) => {
        const { steps, bundle } = target;
        const on = target.id === active;
        return (
          <div
            key={target.id}
            role="tabpanel"
            id={`${base}-panel-${target.id}`}
            aria-labelledby={`${base}-tab-${target.id}`}
            hidden={!on}
            className="mt-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-foreground">
                How to install {title} in {target.name}
                <span className="block text-xs font-normal text-muted">{target.blurb}</span>
              </h3>
              {/* Most setups are more than one block; this saves copying each. */}
              {bundle && (
                <button
                  onClick={() => copyAll(target.id, bundle)}
                  className="ring-focus inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs text-muted transition-colors hover:text-foreground"
                >
                  {copied === target.id ? (
                    <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                  ) : (
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {copied === target.id ? "Copied all" : "Copy all"}
                </button>
              )}
            </div>
            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-semibold text-brand-2"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{step.label}</p>
                    {step.code && <CodeBlock code={step.code} language={step.language} className="mt-2" />}
                    {step.note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        );
      })}

      {/* Announces copy results to screen readers, which can't see the label flip. */}
      <p className="sr-only" aria-live="polite">
        {copied ? `Copied all ${panels.find((t) => t.id === copied)?.name} steps to the clipboard.` : ""}
      </p>
    </div>
  );
}
