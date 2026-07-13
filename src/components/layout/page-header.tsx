import { Aurora } from "@/components/fx/aurora";
import { Reveal } from "@/components/fx/reveal";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  highlight,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 pt-14 pb-10">
      <Aurora />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-brand-2">{eyebrow}</p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {title} <span className="text-gradient">{highlight}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{subtitle}</p>
          {children && <div className="mt-6">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
