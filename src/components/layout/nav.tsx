"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaletteItem } from "@/lib/view";
import { CommandPalette } from "@/components/search/command-palette";
import { ThemeToggle } from "./theme-toggle";
import { SetupLink } from "@/components/cart/setup-link";

const LINKS = [
  { href: "/skills", label: "Skills" },
  { href: "/mcps", label: "MCP Servers" },
  { href: "/repos", label: "Repos" },
  { href: "/tools", label: "Tools" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/whats-new", label: "What's New" },
];

export function Nav({ searchIndex }: { searchIndex: PaletteItem[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation. Adjusted during render so the menu
  // never paints open on the new route.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b border-border/70" : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="ring-focus group flex items-center gap-2.5">
          <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-lg shadow-brand/30">
            <Boxes className="h-5 w-5 text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            AI<span className="text-gradient"> Library</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "ring-focus relative rounded-lg px-3.5 py-2 text-sm transition-colors",
                  active ? "text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {l.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-px brand-gradient" />}
              </Link>
            );
          })}
          <div className="mx-2 flex items-center gap-2">
            <CommandPalette items={searchIndex} />
            <SetupLink />
            <ThemeToggle />
          </div>
          <a
            href="https://github.com/modelcontextprotocol"
            target="_blank"
            rel="noreferrer"
            className="ring-focus rounded-lg brand-gradient px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand/25 transition-transform hover:scale-[1.03] active:scale-95"
          >
            Get Started
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <CommandPalette items={searchIndex} />
          <SetupLink />
          <ThemeToggle />
          <button
          className="ring-focus rounded-lg p-2 text-muted"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="glass-strong border-t border-border/70 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm",
                  pathname.startsWith(l.href) ? "bg-brand/10 text-foreground" : "text-muted",
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
