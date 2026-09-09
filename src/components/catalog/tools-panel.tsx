"use client";

import { useState } from "react";
import { ChevronDown, Lock, Wrench } from "lucide-react";
import type { Mcp } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The tools a server actually exposes, with their input schemas.
 *
 * The registry publishes what a server *is*, never what it *does*, so this is
 * discovered by connecting to the server and calling `tools/list` at build
 * time. That only works for remote servers — asking a packaged one would mean
 * executing an untrusted package on the build machine — and around half of
 * remote servers require credentials. The empty states say which case applies
 * rather than just showing nothing.
 */
export function ToolsPanel({ mcp }: { mcp: Mcp }) {
  const tools = mcp.tools ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const packaged = mcp.packages.length > 0;

  if (tools.length === 0) {
    const reason = packaged
      ? "This server runs as a local package. We only query remote servers for their tool list — asking this one would mean executing it, so its tools are listed in the documentation below."
      : mcp.toolsStatus === "auth"
        ? "This server requires credentials before it will list its tools, so we cannot enumerate them here. Connect it in your client to see what it offers."
        : mcp.toolsStatus === "error"
          ? "The server did not respond when we asked for its tool list. It may be offline, or it may not speak HTTP transport."
          : "No tool list available for this server.";

    return (
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Wrench className="h-4 w-4 text-muted-2" />
          Tools
        </h2>
        <p className="mt-3 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm leading-relaxed text-muted">
          {reason}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Wrench className="h-4 w-4 text-brand-2" />
        Tools <span className="text-muted-2">({tools.length})</span>
      </h2>
      <p className="mt-1 mb-4 text-xs text-muted-2">
        Read from the live server. Click any tool for its input schema.
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/60">
        {tools.map((tool) => {
          const isOpen = open === tool.name;
          const hasInputs = !!tool.inputs?.length;
          return (
            <li key={tool.name}>
              <button
                onClick={() => setOpen(isOpen ? null : tool.name)}
                aria-expanded={isOpen}
                disabled={!hasInputs}
                className="ring-focus flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <code className="shrink-0 font-mono text-sm text-brand-2">{tool.name}</code>
                <span className="min-w-0 flex-1 text-sm text-muted">{tool.description}</span>
                {hasInputs && (
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-muted-2 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                )}
              </button>

              {isOpen && tool.inputs && (
                <div className="border-t border-border/60 bg-background/40 px-4 py-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted-2">
                        <th className="pb-2 pr-3 font-medium">Parameter</th>
                        <th className="pb-2 pr-3 font-medium">Type</th>
                        <th className="pb-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      {tool.inputs.map((input) => (
                        <tr key={input.name} className="border-t border-border/40">
                          <td className="py-2 pr-3">
                            <code className="font-mono text-foreground">{input.name}</code>
                            {input.required && <span className="ml-1 text-danger">*</span>}
                          </td>
                          <td className="py-2 pr-3 font-mono text-muted-2">{input.type}</td>
                          <td className="py-2 text-muted">
                            {input.description}
                            {input.enum && (
                              <span className="mt-1 block font-mono text-[11px] text-muted-2">
                                one of: {input.enum.join(" · ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[11px] text-muted-2">
                    <span className="text-danger">*</span> required
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Credentials and configuration the server needs before it will run. */
export function RequirementsPanel({
  mcp,
  requirements,
}: {
  mcp: Mcp;
  requirements: {
    env: { name: string; description: string | null; required: boolean; secret: boolean }[];
    headers: { name: string; description: string | null; required: boolean; secret: boolean }[];
    authType: { label: string; detail: string } | null;
  };
}) {
  const { env, headers, authType } = requirements;
  if (env.length === 0 && headers.length === 0) return null;

  const rows = [
    ...env.map((e) => ({ ...e, kind: "Environment variable" })),
    ...headers.map((h) => ({ ...h, kind: "HTTP header" })),
  ];

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Lock className="h-4 w-4 text-warn" />
        What you need to supply
      </h2>
      {authType && (
        <p className="mt-1 mb-4 text-xs text-muted-2">
          <span className="text-muted">{authType.label}</span> — {authType.detail}
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={`${row.kind}-${row.name}`} className="rounded-xl border border-border bg-surface/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-sm text-foreground">{row.name}</code>
              {row.required ? (
                <span className="rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger">
                  required
                </span>
              ) : (
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-2">
                  optional
                </span>
              )}
              {row.secret && (
                <span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] text-warn">
                  secret
                </span>
              )}
              <span className="text-[10px] text-muted-2">{row.kind}</span>
            </div>
            {row.description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{row.description}</p>}
          </li>
        ))}
      </ul>

      {mcp.packages.length > 0 && (
        <p className="mt-3 text-xs text-muted-2">
          Pass secrets through your shell environment rather than committing them into a config file.
        </p>
      )}
    </section>
  );
}
