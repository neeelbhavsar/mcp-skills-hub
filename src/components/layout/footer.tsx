import Link from "next/link";
import { Boxes, Star } from "lucide-react";
import { meta } from "@/lib/data";
import { AI_TARGETS } from "@/lib/ai-targets";
import { REPO_URL, SITE_NAME } from "@/lib/seo";
const PORTFOLIO_URL = "https://neelbhavsar.vercel.app/";

/** GitHub mark — lucide no longer ships brand icons. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function Footer() {
  const updated = new Date(meta.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg">
              <Boxes className="h-5 w-5 text-white" />
            </span>
            <span className="text-[15px] font-semibold">
              MCP<span className="text-gradient"> Skills Hub</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            {SITE_NAME} is the directory of MCP servers, Agent Skills and GitHub repos — refreshed daily,
            with copy-paste setup for every AI assistant.
          </p>
          <p className="mt-4 text-xs text-muted">
            Data updated {updated} · {meta.counts.skills + meta.counts.mcps + meta.counts.repos} resources indexed
          </p>
        </div>

        <FooterColumn
          title="Browse"
          links={[
            { href: "/mcps", label: "MCP Servers" },
            { href: "/skills", label: "Agent Skills" },
            { href: "/repos", label: "GitHub Repos" },
            { href: "/tools", label: "Tool search" },
            { href: "/best-mcp-servers", label: "Best MCP servers" },
            { href: "/stacks", label: "Collections" },
            { href: "/use-cases", label: "Use cases" },
            { href: "/whats-new", label: "What's new" },
          ]}
        />

        <FooterColumn
          title="Setup guides"
          links={[
            ...AI_TARGETS.map((t) => ({ href: `/clients/${t.id}`, label: `MCP in ${t.name}` })),
            { href: "/setup", label: "Config generator" },
          ]}
        />

        <FooterColumn
          title="Project"
          links={[
            { href: "/about", label: "About" },
            { href: "/health-score", label: "How health is scored" },
            { href: "/developers", label: "API & MCP server" },
            { href: "/submit", label: "Submit or report" },
            { href: "/feed.xml", label: "RSS feed" },
            { href: "https://registry.modelcontextprotocol.io", label: "MCP Registry", external: true },
          ]}
        />
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-sm text-muted">
            <Star className="mr-1.5 inline h-4 w-4 align-[-3px] text-amber-500" />
            If you like this website and it&rsquo;s helpful for your daily work, please give the
            project a star on GitHub — it keeps the index growing and helps other developers find it.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border/70 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <GithubMark className="h-4 w-4" />
            Star on GitHub
          </a>
        </div>
      </div>

      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-2">
        Built by{" "}
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
        >
          Neel Bhavsar
        </a>{" "}
        · Not affiliated with Anthropic, OpenAI, or Cursor
      </div>
    </footer>
  );
}

/** A footer link list. Headings are h2: footer h4s jumped straight past h2/h3. */
function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 text-sm text-muted">
        {links.map((l) => (
          <li key={l.href}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-foreground">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="inline-flex min-h-11 items-center hover:text-foreground">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
