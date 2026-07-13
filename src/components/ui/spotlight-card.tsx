"use client";

// Mouse-following spotlight card.
// Adapted from "Spotlight Card" by berkcangumusisik on 21st.dev,
// re-tinted to the AI Library brand palette.

import { cn } from "@/lib/utils";
import React, { useRef, useState, type MouseEvent } from "react";

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
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const onMove = (e: MouseEvent<HTMLElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const Tag = as as "div";

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      onMouseMove={onMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn("card-hover relative overflow-hidden rounded-2xl border border-border bg-surface/60", className)}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px z-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(520px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 42%)`,
        }}
      />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </Tag>
  );
}
