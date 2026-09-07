"use client";

import Link from "next/link";
import { Blocks } from "lucide-react";
import { useCartOptional } from "./cart-provider";

/** Nav entry point for the setup builder, showing the selection count. */
export function SetupLink() {
  const cart = useCartOptional();
  const count = cart?.ready ? cart.slugs.length : 0;

  return (
    <Link
      href="/setup"
      className="ring-focus relative flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-2 transition-colors hover:text-foreground"
      aria-label={count ? `Setup builder, ${count} servers selected` : "Setup builder"}
    >
      <Blocks className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Setup</span>
      {count > 0 && (
        <span className="brand-gradient inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
