"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronDown,
  FileSearch,
  Info,
  Package,
  ScrollText,
  ShieldQuestion,
  Terminal,
} from "lucide-react";
import type { Mcp } from "@/lib/types";
import {
  LIMITATIONS,
  inspectionUnavailableReason,
  summarizeCapabilities,
} from "@/lib/capabilities";
import { cn } from "@/lib/utils";

const WEIGHT_STYLE = {
  high: "border-warn/40 bg-warn/5",
  medium: "border-border bg-surface/60",
  low: "border-border bg-surface/60",
} as const;

/**
 * What the published source actually reaches for.
 *
 * This states things about code its authors wrote, so the presentation is as
 * important as the analysis: every claim carries a file and line, the wording
 * describes rather than judges, and the limitations sit next to the findings
 * rather than in a footnote — a capability list on its own reads as a clean
 * bill of health, which it explicitly is not.
 */
export function CapabilityPanel({ mcp }: { mcp: Mcp }) {
  const summary = summarizeCapabilities(mcp);
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const [showLimits, setShowLimits] = useState(false);

  if (!summary) {
    return (
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileSearch className="h-4 w-4 text-muted-2" />
          What the code can do
        </h2>
        <p className="mt-3 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm leading-relaxed text-muted">
          {inspectionUnavailableReason(mcp)}
        </p>
      </section>
    );
  }

  const { publisher } = summary;
  const hasPublisherSignals =
    publisher.trustedPublisher || publisher.provenance || publisher.maintainers || publisher.installScripts;

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <FileSearch className="h-4 w-4 text-brand-2" />
        What the code can do
      </h2>
      <p className="mt-1 text-xs text-muted-2">
        Read from the published package source — never executed.{" "}
        {summary.coverage && <>Parsed {summary.coverage}. </>}
        {summary.status === "partial" && (
          <span className="text-warn">Some files could not be parsed, so this may be incomplete.</span>
        )}
      </p>

      {/* The plain-English headline — the thing most readers will act on. */}
      <p className="mt-4 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm leading-relaxed text-foreground">
        {summary.sentence}
      </p>

      {/*
        Attribution caveat, not a hedge. A bundle inlines its dependencies, so
        the capability genuinely ships and genuinely runs — but saying the
        author reached for child_process would be a claim we cannot support.
      */}
      {summary.hasBundled && (
        <p className="mt-2 flex gap-2 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-xs leading-relaxed text-muted">
          <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2" />
          <span>
            {summary.bundledOnly ? "This package ships bundled code" : "Some of this package is bundled"} —
            its dependencies are compiled into the published files. The capabilities below are really in
            what runs on your machine, but they may come from a bundled library rather than the author&apos;s
            own source.
          </span>
        </p>
      )}

      {summary.capabilities.length > 0 && (
        <ul className="mt-3 space-y-2">
          {summary.capabilities.map(({ id, copy, evidence }) => {
            const open = openEvidence === id;
            return (
              <li key={id} className={cn("rounded-xl border", WEIGHT_STYLE[copy.weight])}>
                <button
                  onClick={() => setOpenEvidence(open ? null : id)}
                  aria-expanded={open}
                  className="ring-focus flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{copy.label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted">{copy.plain}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-muted-2 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open && (
                  <div className="border-t border-border/60 px-4 py-3">
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-2">
                      Observed at
                    </p>
                    <ul className="space-y-1">
                      {evidence.map((e, i) => (
                        <li key={`${e.file}-${e.line}-${i}`} className="font-mono text-xs text-muted">
                          <span className="text-brand-2">
                            {e.file}:{e.line}
                          </span>{" "}
                          — {e.detail}
                          {e.bundled && (
                            <span className="ml-1 font-sans text-[10px] text-muted-2">(bundled file)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasPublisherSignals && (
        <div className="mt-4 rounded-xl border border-border bg-surface/60 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-2">How it was published</p>
          <ul className="space-y-1.5 text-sm">
            {publisher.installScripts && (
              <li className="flex gap-2">
                <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <span className="text-muted">
                  <span className="text-foreground">
                    Runs {publisher.installScripts.join(", ")} on install
                  </span>{" "}
                  — this executes when you install the package, before you deliberately run anything.
                </span>
              </li>
            )}
            {publisher.trustedPublisher && (
              <li className="flex gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="text-muted">
                  <span className="text-foreground">Published by a verified CI identity</span> (
                  {publisher.trustedPublisher} trusted publishing) rather than a personal token.
                </span>
              </li>
            )}
            {publisher.provenance && (
              <li className="flex gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="text-muted">
                  <span className="text-foreground">Has a provenance attestation</span> tying this
                  artifact to the commit it was built from.
                </span>
              </li>
            )}
            {!publisher.trustedPublisher && !publisher.provenance && (
              <li className="flex gap-2">
                <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
                <span className="text-muted">
                  No provenance attestation — there is nothing linking this published artifact to a
                  specific source commit.
                </span>
              </li>
            )}
            {publisher.maintainers != null && (
              <li className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
                <span className="text-muted">
                  {publisher.maintainers} npm maintainer{publisher.maintainers === 1 ? "" : "s"}
                  {publisher.maintainers === 1 && " — a single point of compromise"}
                  {publisher.publishedBy && ` · last published by ${publisher.publishedBy}`}.
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Deliberately adjacent to the findings, not tucked away in a footer. */}
      <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-3">
        <button
          onClick={() => setShowLimits((v) => !v)}
          aria-expanded={showLimits}
          className="ring-focus flex w-full items-center gap-2 text-left text-xs font-medium text-muted"
        >
          <Info className="h-3.5 w-3.5 shrink-0" />
          What this analysis cannot tell you
          <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", showLimits && "rotate-180")} />
        </button>
        {showLimits && (
          <ul className="mt-3 space-y-2">
            {LIMITATIONS.map((limit) => (
              <li key={limit} className="flex gap-2 text-xs leading-relaxed text-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-2" />
                {limit}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-2">
          Maintainer of this package and think something here is wrong?{" "}
          <Link href="/submit" className="text-brand hover:underline">
            Tell us and we&apos;ll correct it
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
