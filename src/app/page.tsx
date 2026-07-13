import Link from "next/link";
import { Blocks, Boxes, GitFork, RefreshCw, Terminal, Wand2, ArrowRight } from "lucide-react";
import { featured, meta } from "@/lib/data";
import { skillToCard, mcpToCard, repoToCard } from "@/lib/view";
import { Hero } from "@/components/home/hero";
import { SectionPreview } from "@/components/home/section-preview";
import { Reveal, RevealGroup, RevealItem } from "@/components/fx/reveal";
import { Aurora } from "@/components/fx/aurora";

const STEPS = [
  {
    icon: <Wand2 className="h-5 w-5" />,
    title: "Discover",
    body: "Browse skills, MCP servers and repos by category. Search by use-case and filter to exactly what your workflow needs.",
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: "Copy the setup",
    body: "Every resource ships with copy-paste install steps generated for Claude Code, Cursor, Codex, Windsurf, VS Code and more.",
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: "Always current",
    body: "A daily automated pipeline pulls new drops from the official registries and GitHub — so the library never goes stale.",
  },
];

export default function Home() {
  const updated = new Date(meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <>
      <Hero counts={meta.counts} updatedLabel={updated} />

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
        eyebrow="Model Context Protocol"
        title="Give your AI real"
        highlight="tools"
        description="Connect databases, browsers, APIs and files through MCP — configured for your client."
        href="/mcps"
        cta="All MCP servers"
        icon={<Blocks className="h-3.5 w-3.5" />}
        items={featured.mcps.map(mcpToCard)}
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
            <Boxes className="mx-auto mb-5 h-10 w-10 text-brand" />
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Your AI toolkit, <span className="text-gradient">all in one place</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              {(meta.counts.skills + meta.counts.mcps + meta.counts.repos).toLocaleString()} resources
              indexed and refreshed daily. Find what you need, copy the setup, ship.
            </p>
            <Link
              href="/mcps"
              className="ring-focus group mt-8 inline-flex items-center gap-2 rounded-xl brand-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95"
            >
              Start exploring
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
