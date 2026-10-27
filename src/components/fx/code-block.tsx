"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language = "bash",
  className,
  filename,
}: {
  code: string;
  language?: string;
  className?: string;
  /** When set, adds a Download button that saves `code` under this name. */
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  function download() {
    const type = language === "json" ? "application/json" : "text/plain";
    const url = URL.createObjectURL(new Blob([`${code}\n`], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename!;
    a.click();
    URL.revokeObjectURL(url);
  }

  const button =
    "ring-focus flex min-h-11 items-center gap-1 rounded-md px-2 text-xs text-muted transition-colors hover:text-foreground";

  return (
    <div className={cn("group relative overflow-hidden rounded-xl border border-border bg-[var(--code-bg)]", className)}>
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">{language}</span>
        <div className="flex items-center gap-1">
          {filename && (
            <button onClick={download} className={button} aria-label={`Download ${filename}`}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download
            </button>
          )}
          <button onClick={copy} className={button} aria-label="Copy code">
            {copied ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed">
        <code className="font-mono text-[var(--code-fg)] whitespace-pre">{code}</code>
      </pre>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to the clipboard." : ""}
      </span>
    </div>
  );
}
