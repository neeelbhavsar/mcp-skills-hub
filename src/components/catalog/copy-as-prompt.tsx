"use client";

import { useState } from "react";
import { Check, MessageSquareQuote } from "lucide-react";

/**
 * Copy a ready-to-paste instruction for an agent, rather than a config the
 * user has to place themselves. For anyone driving Claude Code or Cursor, the
 * fastest path to a working server is telling the agent to install it.
 */
export function CopyAsPrompt({ prompt, label = "Copy as prompt" }: { prompt: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-brand/50"
      title="Copy an instruction you can paste straight into your agent"
    >
      {copied ? (
        <Check className="h-4 w-4 text-accent" />
      ) : (
        <MessageSquareQuote className="h-4 w-4" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
