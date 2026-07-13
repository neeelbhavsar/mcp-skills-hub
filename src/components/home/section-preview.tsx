import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import type { CardItem } from "@/lib/view";
import { Badge } from "@/components/ui/badge";
import { Reveal, RevealGroup, RevealItem } from "@/components/fx/reveal";
import { formatStars } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionPreview({
  eyebrow,
  title,
  highlight,
  description,
  href,
  cta,
  items,
  icon,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  href: string;
  cta: string;
  items: CardItem[];
  icon: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <Reveal className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-brand-2">
            {icon}
            {eyebrow}
          </div>
          <h2 className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">
            {title} <span className="text-gradient">{highlight}</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>
        </div>
        <Link
          href={href}
          className="ring-focus group inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface/70 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/50"
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>

      <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <RevealItem key={item.id}>
            <Link
              href={href}
              className="card-hover group flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge tone="brand" className="capitalize">{item.category}</Badge>
                {item.stars != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Star className="h-3.5 w-3.5 text-warn" />
                    {formatStars(item.stars)}
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-semibold capitalize text-foreground">{item.title}</h3>
              <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.pills.slice(0, 2).map((p) => (
                  <Badge key={p.label} tone={p.tone}>{p.label}</Badge>
                ))}
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
