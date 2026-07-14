import Link from "next/link";
import { ArrowLeft, ExternalLink, GitFork, Star } from "lucide-react";
import type { CardItem } from "@/lib/view";
import type { Mcp, Repo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AiUsage } from "./ai-usage";
import { ResourceExtras } from "./resource-extras";
import { formatStars } from "@/lib/utils";
import { KIND_META, absoluteUrl, breadcrumbJsonLd, resourcePath } from "@/lib/seo";

/** schema.org node describing the resource itself. */
function itemJsonLd(item: CardItem) {
  const url = absoluteUrl(resourcePath(item.kind, item.slug));
  const base = {
    "@context": "https://schema.org",
    name: item.title,
    description: item.description,
    url,
    ...(item.externalUrl && item.externalUrl !== "#"
      ? { sameAs: item.externalUrl }
      : {}),
  };

  if (item.kind === "repos") {
    const r = item.raw as Repo;
    return {
      ...base,
      "@type": "SoftwareSourceCode",
      codeRepository: r.url,
      ...(r.language ? { programmingLanguage: r.language } : {}),
      ...(r.license ? { license: r.license } : {}),
    };
  }

  return {
    ...base,
    "@type": "SoftwareApplication",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    ...(item.kind === "mcps" && (item.raw as Mcp).license
      ? { license: (item.raw as Mcp).license }
      : {}),
  };
}

export function ResourceDetail({ item }: { item: CardItem }) {
  const kind = KIND_META[item.kind];
  const jsonLd = [
    breadcrumbJsonLd([
      { name: kind.label, path: kind.path },
      { name: item.title, path: resourcePath(item.kind, item.slug) },
    ]),
    itemJsonLd(item),
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-muted-2">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={kind.path} className="hover:text-foreground">{kind.label}</Link>
        <span>/</span>
        <span className="truncate text-muted">{item.title}</span>
      </nav>

      <Link
        href={kind.path}
        className="ring-focus mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All {kind.label}
      </Link>

      <header>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="brand" className="capitalize">{item.category}</Badge>
          {item.pills.slice(0, 3).map((p) => (
            <Badge key={p.label} tone={p.tone}>{p.label}</Badge>
          ))}
        </div>
        <h1 className="text-2xl font-bold capitalize tracking-tight sm:text-3xl">{item.title}</h1>
        <p className="mt-2 text-sm text-muted-2">{item.footer}</p>
      </header>

      <p className="mt-5 text-base leading-relaxed text-muted">{item.description}</p>

      <ResourceExtras item={item} />

      <div className="mt-6 flex flex-wrap gap-2">
        {item.externalUrl && item.externalUrl !== "#" && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="ring-focus inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-brand/50"
          >
            {item.kind === "repos" ? <GitFork className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {item.kind === "repos" ? "View on GitHub" : "Source"}
          </a>
        )}
        {item.stars != null && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted">
            <Star className="h-4 w-4 text-warn" /> {formatStars(item.stars)}
          </span>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-base font-semibold">
          How to use this in <span className="text-gradient">your AI</span>
        </h2>
        <p className="mt-1 mb-4 text-xs text-muted-2">Pick your assistant — copy-paste ready.</p>
        <AiUsage item={item} />
      </section>
    </article>
  );
}
