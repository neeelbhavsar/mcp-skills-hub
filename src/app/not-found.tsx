import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

// No canonical: a missing page is not a copy of anything. The root layout
// used to supply `canonical: "/"`, which every 404 inherited. No robots tag
// either: Next.js already marks not-found responses noindex.
export const metadata: Metadata = {
  title: "Page not found",
};

const LINKS = [
  { href: "/mcps", label: "MCP servers" },
  { href: "/best-mcp-servers", label: "Best MCP servers" },
  { href: "/skills", label: "Agent Skills" },
  { href: "/tools", label: "Search by tool" },
  { href: "/clients", label: "Setup guides" },
];

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <SearchX className="mb-4 h-10 w-10 text-muted" aria-hidden />
      <h1 className="text-2xl font-bold tracking-tight">This page isn&apos;t here</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Servers and skills leave the catalog when they are withdrawn from their registry, so an old link can
        land here. Try one of these instead, or press ⌘K to search everything.
      </p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="ring-focus inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm text-foreground hover:border-brand/50"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
