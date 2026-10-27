import { Aurora } from "@/components/fx/aurora";
import type { ReactNode } from "react";

/**
 * The H1 block at the top of every listing and content page. Server-rendered
 * and visible from the first frame: it used to sit inside a scroll-reveal
 * that started at opacity 0, so the LCP element on every listing waited for
 * hydration.
 */
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
        <div className="animate-rise">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-brand-2">{eyebrow}</p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {title}
            {highlight && (
              <>
                {" "}
                <span className="text-gradient">{highlight}</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{subtitle}</p>
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}
