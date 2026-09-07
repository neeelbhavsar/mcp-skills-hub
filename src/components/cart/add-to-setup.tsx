"use client";

import { Check, Plus } from "lucide-react";
import { useToggleServer } from "./cart-provider";
import { cn } from "@/lib/utils";

/**
 * Tick a server into the setup builder. Rendered on MCP cards and detail
 * pages; renders nothing outside the provider so it is safe to drop anywhere.
 */
export function AddToSetup({
  slug,
  variant = "icon",
  className,
}: {
  slug: string;
  variant?: "icon" | "full";
  className?: string;
}) {
  const { selected, toggle, available } = useToggleServer(slug);
  if (!available) return null;

  const label = selected ? "Remove from setup" : "Add to setup";

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={(e) => {
        // Cards wrap this in a link — don't navigate when ticking.
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={cn(
        "ring-focus inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors",
        variant === "icon" ? "h-7 w-7" : "px-3 py-1.5",
        selected
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-border bg-surface text-muted hover:text-foreground",
        className,
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {variant === "full" && (selected ? "In setup" : "Add to setup")}
    </button>
  );
}
