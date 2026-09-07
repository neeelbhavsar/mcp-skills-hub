"use client";

// Mouse-following spotlight card.
// Adapted from "Spotlight Card" by berkcangumusisik on 21st.dev,
// re-tinted to the AI Library brand palette.

import { cn } from "@/lib/utils";
import React, { useCallback, useRef, type MouseEvent } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spotlightColor?: string;
  as?: "div" | "button";
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(124, 107, 255, 0.18)",
  as = "div",
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // The pointer position is written straight to CSS custom properties rather
  // than React state. Storing it in state re-rendered the whole card on every
  // mousemove event, which with a 24-card grid mounted was enough to drop
  // frames on mid-range hardware.
  const onMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }, []);

  const setOpacity = useCallback((value: string) => {
    ref.current?.style.setProperty("--spot-opacity", value);
  }, []);

  const Tag = as as "div";

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      onMouseMove={onMove}
      onMouseEnter={() => setOpacity("1")}
      onMouseLeave={() => setOpacity("0")}
      className={cn("card-hover relative overflow-hidden rounded-2xl border border-border bg-surface/60", className)}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px z-0 transition-opacity duration-300"
        style={{
          opacity: "var(--spot-opacity, 0)",
          background: `radial-gradient(520px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 42%)`,
        }}
      />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </Tag>
  );
}
