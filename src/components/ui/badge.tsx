import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "brand" | "accent" | "outline";
}) {
  const tones = {
    default: "bg-surface-2 text-muted border-border",
    brand: "bg-brand/12 text-brand border-brand/30",
    accent: "bg-accent/12 text-accent border-accent/30",
    outline: "bg-transparent text-muted border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
