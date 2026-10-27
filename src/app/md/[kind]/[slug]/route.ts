import { getMcp, getRepo, getSkill, mcps, meta, repos, skills } from "@/lib/data";
import { mcpMarkdown, repoMarkdown, skillMarkdown } from "@/lib/markdown";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...mcps.map((m) => ({ kind: "mcps", slug: m.slug })),
    ...skills.map((s) => ({ kind: "skills", slug: s.slug })),
    ...repos.map((r) => ({ kind: "repos", slug: r.slug })),
  ];
}

/**
 * The detail page as Markdown — install steps for every client, tools and the
 * at-a-glance summary — for agents that would rather not parse HTML. Linked
 * from each page as <link rel="alternate" type="text/markdown">.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  const mcp = kind === "mcps" ? getMcp(slug) : undefined;
  const skill = kind === "skills" ? getSkill(slug) : undefined;
  const repo = kind === "repos" ? getRepo(slug) : undefined;
  const body = mcp
    ? mcpMarkdown(mcp, meta.updatedAt)
    : skill
      ? skillMarkdown(skill, meta.updatedAt)
      : repo
        ? repoMarkdown(repo, meta.updatedAt)
        : null;
  if (!body) return new Response("Not found", { status: 404 });

  return new Response(body + "\n", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      // The HTML page is the canonical; this is an alternate representation.
      "X-Robots-Tag": "noindex",
      Link: `<${SITE_URL}/${kind}/${slug}>; rel="canonical"`,
    },
  });
}
