"use client";

import Link from "next/link";
import { useState } from "react";
import { Blocks, Check, Link2, Scale, Trash2, X } from "lucide-react";
import { AI_TARGETS, mergedConfig } from "@/lib/ai-targets";
import { CodeBlock } from "@/components/fx/code-block";
import { useCart } from "./cart-provider";
import { cn } from "@/lib/utils";

/** The /setup page body: pick a client, get one config for every server. */
export function SetupBuilder({ packs }: { packs: { slug: string; name: string; tagline: string; servers: string[] }[] }) {
  const { entries, remove, clear, replace, shareUrl, ready } = useCart();
  const [client, setClient] = useState(AI_TARGETS[0].id);
  const [copiedLink, setCopiedLink] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60" aria-hidden />;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
        <Blocks className="mb-3 h-8 w-8 text-muted-2" />
        <p className="text-sm text-muted">No servers selected yet.</p>
        <p className="mt-1 max-w-sm text-xs text-muted-2">
          Browse the catalog and hit “Add to setup” on any server. They will collect here as a single config.
        </p>
        <Link href="/mcps" className="mt-4 text-sm text-brand hover:underline">
          Browse MCP servers
        </Link>

        <div className="mt-8 w-full border-t border-border pt-6">
          <p className="mb-3 text-xs font-medium text-muted-2">Or start from a pack</p>
          <div className="flex flex-wrap justify-center gap-2">
            {packs.map((p) => (
              <button
                key={p.slug}
                onClick={() => replace(p.servers)}
                title={p.tagline}
                className="ring-focus rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand/50 hover:text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const config = mergedConfig(entries, client);
  const unusable = entries.filter((e) => e.launch.mode === "unknown");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{entries.length}</span> server
          {entries.length === 1 ? "" : "s"} selected
        </p>
        <div className="flex items-center gap-2">
          {/* Selections were ephemeral; a link makes a stack shareable. */}
          <button
            onClick={copyLink}
            disabled={!shareUrl}
            className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-accent" /> : <Link2 className="h-3.5 w-3.5" />}
            {copiedLink ? "Link copied" : "Share this stack"}
          </button>
          {entries.length >= 2 && (
            <Link
              href={`/compare?servers=${entries.slice(0, 4).map((e) => e.slug).join(",")}`}
              className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              <Scale className="h-3.5 w-3.5" /> Compare
            </Link>
          )}
          <button
            onClick={clear}
            className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      <ul className="mb-8 flex flex-wrap gap-2">
        {entries.map((e) => (
          <li
            key={e.slug}
            className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs"
          >
            <Link href={`/mcps/${e.slug}`} className="text-foreground hover:text-brand">
              {e.name}
            </Link>
            <span className="font-mono text-[10px] text-muted-2">{e.key}</span>
            <button
              onClick={() => remove(e.slug)}
              aria-label={`Remove ${e.name}`}
              className="ring-focus rounded text-muted-2 hover:text-danger"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {AI_TARGETS.map((t) => {
          const on = t.id === client;
          return (
            <button
              key={t.id}
              onClick={() => setClient(t.id)}
              aria-pressed={on}
              className={cn(
                "ring-focus rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                on ? "border-transparent text-white" : "border-border text-muted hover:text-foreground",
              )}
              style={on ? { background: `linear-gradient(100deg, ${t.color}, ${t.color}cc)` } : undefined}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      <p className="mt-4 mb-2 text-xs text-muted-2">
        Paste into <span className="font-mono text-muted">{config.target}</span>
      </p>
      <CodeBlock code={config.code} language={config.language} />

      {unusable.length > 0 && (
        <p className="mt-4 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3 text-xs text-muted">
          {unusable.length} selected {unusable.length === 1 ? "server has" : "servers have"} no package or
          endpoint published, so {unusable.length === 1 ? "it is" : "they are"} left out of this config:{" "}
          {unusable.map((e) => e.name).join(", ")}.
        </p>
      )}
    </div>
  );
}
