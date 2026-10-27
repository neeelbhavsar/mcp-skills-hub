import type { Metadata } from "next";
import Link from "next/link";
import { Blocks, Boxes, GitFork, RefreshCw, Terminal, Wand2, ArrowRight, BookOpen, Layers, Trophy } from "lucide-react";
import { featured, meta, recentMcps } from "@/lib/data";
import { skillToCard, mcpToCard, repoToCard } from "@/lib/view";
import { Hero } from "@/components/home/hero";
import { SectionPreview } from "@/components/home/section-preview";
import { Reveal, RevealGroup, RevealItem } from "@/components/fx/reveal";
import { Aurora } from "@/components/fx/aurora";

// The site-wide layout no longer sets a canonical (the 404 page inherited it),
// so the home page declares its own.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const STEPS = [
  {
    icon: <Wand2 className="h-5 w-5" />,
    title: "Discover",
    body: "Browse MCP servers, skills and repos by category, or search by the tool you need. Health scores and code inspection show what you are installing.",
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: "Copy the setup",
    body: "Every server ships with the exact config for Claude Code, Claude Desktop, Cursor, Codex, Windsurf, Cline and VS Code — or merge several into one file.",
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: "Always current",
    body: "A daily pipeline reads the official MCP Registry, npm, PyPI and GitHub, so new servers appear and abandoned ones are flagged without anyone curating by hand.",
  },
];

const GUIDES = [
  { href: "/best-mcp-servers", icon: Trophy, title: "Best MCP servers", body: "The top servers ranked by health score, with the reason each made the list." },
  { href: "/clients", icon: BookOpen, title: "Setup guides per client", body: "Where the config file lives and what format it takes in Cursor, VS Code, Claude and more." },
  { href: "/stacks", icon: Layers, title: "Collections", body: "Reviewed server bundles for a job, loadable into the setup builder as one config." },
];

export default function Home() {
  const updated = new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <>
      <Hero counts={meta.counts} updatedLabel={updated} />

      {/* How it works */}
      <section aria-labelledby="how-it-works" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 id="how-it-works" className="sr-only">
          How it works
        </h2>
        <RevealGroup className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <RevealItem key={s.title}>
              <div className="h-full rounded-2xl border border-border bg-surface/50 p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-brand/25">
                  {s.icon}
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <SectionPreview
        eyebrow="Model Context Protocol"
        title="Give your AI real"
        highlight="tools"
        description="Connect databases, browsers, APIs and files through MCP — configured for your client."
        href="/mcps"
        cta="All MCP servers"
        icon={<Blocks className="h-3.5 w-3.5" />}
        items={featured.mcps.map(mcpToCard)}
      />

      <section aria-labelledby="start-here" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 id="start-here" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Not sure where to <span className="text-gradient">start?</span>
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {GUIDES.map(({ href, icon: Icon, title, body }) => (
            <li key={href}>
              <Link
                href={href}
                className="ring-focus group flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-5 transition-colors hover:border-brand/50"
              >
                <Icon className="mb-3 h-5 w-5 text-brand-2" aria-hidden />
                <span className="text-base font-semibold text-foreground">{title}</span>
                <span className="mt-1.5 text-sm text-muted">{body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <SectionPreview
        eyebrow="Agent Skills"
        title="Teach your AI new"
        highlight="superpowers"
        description="Drop-in capabilities — from PDF and Excel wrangling to design systems and research."
        href="/skills"
        cta="All skills"
        icon={<Wand2 className="h-3.5 w-3.5" />}
        items={featured.skills.map(skillToCard)}
      />

      <SectionPreview
        eyebrow="Fresh from the registry"
        title="Just published this"
        highlight="week"
        description="The newest MCP servers to land in the official registry — updated daily. Subscribe via RSS to follow along."
        // Not /mcps?sort=recent: that URL canonicalises to /mcps, so linking it
        // from here made Google crawl it only to report "Alternate page with
        // proper canonical tag". /whats-new is the purpose-built page anyway.
        href="/whats-new"
        cta="See what's new"
        icon={<RefreshCw className="h-3.5 w-3.5" />}
        items={recentMcps.map(mcpToCard)}
      />

      <SectionPreview
        eyebrow="Curated GitHub"
        title="Build faster with the best"
        highlight="repos"
        description="Star-ranked repositories for agents, RAG and LLM tooling — ready to clone into your editor."
        href="/repos"
        cta="All repos"
        icon={<GitFork className="h-3.5 w-3.5" />}
        items={featured.repos.map(repoToCard)}
      />

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/50 px-6 py-16 text-center">
            <Aurora />
            <Boxes className="mx-auto mb-5 h-10 w-10 text-brand" aria-hidden />
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Your AI toolkit, <span className="text-gradient">all in one place</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              {(meta.counts.skills + meta.counts.mcps + meta.counts.repos).toLocaleString("en-US")} resources
              indexed and refreshed daily. Find what you need, copy the setup, ship.
            </p>
            <Link
              href="/mcps"
              className="ring-focus group mt-8 inline-flex items-center gap-2 rounded-xl brand-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95"
            >
              Start exploring
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
