"use client";

import { Download } from "lucide-react";
import type { Mcp } from "@/lib/types";
import { installLinks } from "@/lib/ai-targets";

/**
 * One-click install via each editor's URL handler:
 *   VS Code — vscode:mcp/install?<url-encoded JSON>
 *   Cursor  — cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=<base64>
 *
 * These hand the config straight to the editor, which still shows its own
 * confirmation before adding anything.
 */
export function InstallButtons({ mcp }: { mcp: Mcp }) {
  const links = installLinks(mcp);
  if (links.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-medium text-muted-2">One-click install</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.href}
            className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-brand/50"
          >
            <Download className="h-4 w-4" />
            {l.label}
          </a>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-2">
        Opens your editor and pre-fills the config. Your editor will ask before adding it.
      </p>
    </div>
  );
}
