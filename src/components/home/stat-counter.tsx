"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

export function StatCounter({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-gradient">{display.toLocaleString()}</span>
        <span className="text-brand-2">{suffix}</span>
      </div>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-2">{label}</p>
    </div>
  );
}
