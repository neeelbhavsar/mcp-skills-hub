import Link from "next/link";
import { Star, ArrowUpRight } from "lucide-react";
import type { CardItem } from "@/lib/view";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { formatStars } from "@/lib/utils";
import { resourcePath } from "@/lib/seo";

export function ResourceCard({ item }: { item: CardItem }) {
  return (
    <Link
      href={resourcePath(item.kind, item.slug)}
      className="ring-focus block h-full rounded-2xl"
      aria-label={item.title}
    >
      <SpotlightCard as="div" className="h-full w-full p-5 text-left">
        <div className="mb-3 flex items-start justify-between gap-3">
          <Badge tone="brand" className="capitalize">{item.category}</Badge>
          {item.stars != null ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Star className="h-3.5 w-3.5 text-warn" />
              {formatStars(item.stars)}
            </span>
          ) : (
            <ArrowUpRight className="h-4 w-4 text-muted-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          )}
        </div>

        <h3 className="text-[15px] font-semibold capitalize leading-snug text-foreground">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
          {item.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {item.pills.slice(0, 3).map((p) => (
            <Badge key={p.label} tone={p.tone}>{p.label}</Badge>
          ))}
        </div>

        <p className="mt-3 truncate text-xs text-muted-2">{item.footer}</p>
      </SpotlightCard>
    </Link>
  );
}
