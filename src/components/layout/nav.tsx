"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/search/command-palette";
import { ThemeToggle } from "./theme-toggle";
import { SetupLink } from "@/components/cart/setup-link";

const LINKS = [
  { href: "/mcps", label: "MCP Servers" },
  { href: "/skills", label: "Skills" },
  { href: "/repos", label: "Repos" },
  { href: "/tools", label: "Tools" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/clients", label: "Guides" },
  { href: "/whats-new", label: "What's New" },
];

/** Only in the menu: the desktop row has no room, and these are one click from the home page. */
const MENU_EXTRA = [
  { href: "/best-mcp-servers", label: "Best MCP servers" },
  { href: "/stacks", label: "Collections" },
  { href: "/setup", label: "Setup builder" },
  { href: "/about", label: "About" },
];

export function Nav({ searchIndexUrl }: { searchIndexUrl: string }) {
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
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="ring-focus group flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg">
          <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-lg shadow-brand/30">
            <Boxes className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            MCP<span className="text-gradient"> Skills Hub</span>
          </span>
        </Link>

        {/* The full link row needs ~900px, so it only appears from lg up;
            tablets get the compact bar and the menu below. */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ring-focus relative inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-2.5 text-sm transition-colors xl:px-3",
                  active ? "text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {l.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-px brand-gradient" />}
              </Link>
            );
          })}
          <div className="ml-2 flex items-center gap-2">
            <CommandPalette indexUrl={searchIndexUrl} />
            <SetupLink />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
          <CommandPalette indexUrl={searchIndexUrl} />
          <SetupLink />
          {/* Too wide next to the wordmark on phones; it is in the menu there. */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <button
            className="ring-focus flex h-11 w-11 items-center justify-center rounded-lg text-muted"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="glass-strong max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border/70 lg:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:grid-cols-2 sm:px-6">
            {[...LINKS, ...MENU_EXTRA].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-sm",
                  pathname.startsWith(l.href) ? "bg-brand/10 text-foreground" : "text-muted",
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mx-auto flex max-w-7xl items-center gap-3 border-t border-border/70 px-4 py-3 text-xs text-muted sm:hidden">
            Theme
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
