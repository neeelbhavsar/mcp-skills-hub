import Link from "next/link";
import { Boxes } from "lucide-react";
import { meta } from "@/lib/data";

export function Footer() {
  const updated = new Date(meta.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg">
              <Boxes className="h-5 w-5 text-white" />
            </span>
            <span className="text-[15px] font-semibold">
              AI<span className="text-gradient"> Library</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            The all-in-one directory of AI Skills, MCP servers and GitHub repos — refreshed daily,
            with copy-paste setup for every AI assistant.
          </p>
          <p className="mt-4 text-xs text-muted-2">
            Data updated {updated} · {meta.counts.skills + meta.counts.mcps + meta.counts.repos} resources indexed
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Browse</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/skills" className="hover:text-foreground">Skills</Link></li>
            <li><Link href="/mcps" className="hover:text-foreground">MCP Servers</Link></li>
            <li><Link href="/repos" className="hover:text-foreground">GitHub Repos</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Sources</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><a href="https://registry.modelcontextprotocol.io" target="_blank" rel="noreferrer" className="hover:text-foreground">MCP Registry</a></li>
            <li><a href="https://github.com/anthropics/skills" target="_blank" rel="noreferrer" className="hover:text-foreground">Anthropic Skills</a></li>
            <li><a href="https://glama.ai" target="_blank" rel="noreferrer" className="hover:text-foreground">Glama</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-2">
        Built for developers · Not affiliated with Anthropic, OpenAI, or Cursor
      </div>
    </footer>
  );
}
