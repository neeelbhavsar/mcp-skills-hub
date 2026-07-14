import type { CardItem } from "@/lib/view";
import type { Mcp, Repo, Skill } from "@/lib/types";

/**
 * Kind-specific extra detail (MCP tools, included skills, repo topics).
 * Presentational only — safe to render in both server and client trees.
 */
export function ResourceExtras({ item }: { item: CardItem }) {
  if (item.kind === "mcps") {
    const m = item.raw as Mcp;
    if (!m.tools?.length) return null;
    return (
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-2">Exposed tools</p>
        <div className="flex flex-wrap gap-1.5">
          {m.tools.slice(0, 10).map((t) => (
            <span key={t} className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-brand-2">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (item.kind === "skills") {
    const s = item.raw as Skill;
    if (!s.skills.length) return null;
    return (
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-2">Included skills</p>
        <div className="flex flex-wrap gap-1.5">
          {s.skills.map((sk) => (
            <span key={sk} className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-accent">
              {sk.replace(/^\.\/skills\//, "")}
            </span>
          ))}
        </div>
      </div>
    );
  }
  const r = item.raw as Repo;
  if (item.kind === "repos" && r.topics?.length) {
    return (
      <div className="mt-4 flex flex-wrap gap-1.5">
        {r.topics.map((t) => (
          <span key={t} className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-muted">
            #{t}
          </span>
        ))}
      </div>
    );
  }
  return null;
}
