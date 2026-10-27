import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { meta, skills } from "@/lib/data";
import { skillToCard } from "@/lib/view";
import { CodeBlock } from "@/components/fx/code-block";
import { ResourceCard } from "@/components/catalog/resource-card";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE, SITE_URL, absoluteUrl, breadcrumbJsonLd, jsonLdScript, ogTitle } from "@/lib/seo";

const TITLE = "What are Agent Skills? How to use them in Claude Code, Cursor and more";
const DESCRIPTION =
  "Agent Skills are folders of instructions, scripts and resources that teach an AI assistant a task. What they are, how they differ from MCP servers, and how to install them in Claude Code, Claude, Cursor and Codex.";

export const metadata: Metadata = {
  title: "What are Agent Skills? A practical guide",
  description: DESCRIPTION,
  alternates: { canonical: "/agent-skills" },
  openGraph: { type: "article", url: "/agent-skills", title: ogTitle("What are Agent Skills?"), description: DESCRIPTION, images: [OG_IMAGE] },
};

/**
 * "claude code skills" is answered almost entirely by explainers, and the
 * site only had the /skills grid. This is the explainer, ending in the grid.
 */
export default function AgentSkillsPage() {
  const top = [...skills].sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1)).slice(0, 6);

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Skills", path: "/skills" },
      { name: "What are Agent Skills?", path: "/agent-skills" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "@id": `${absoluteUrl("/agent-skills")}#article`,
      headline: TITLE,
      description: DESCRIPTION,
      url: absoluteUrl("/agent-skills"),
      dateModified: meta.updatedAt,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader eyebrow="Guide" title="What are" highlight="Agent Skills?" subtitle={DESCRIPTION} />

      <article className="mx-auto max-w-3xl space-y-10 px-4 py-10 text-base leading-relaxed text-muted sm:px-6">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">The short answer</h2>
          <p>
            An Agent Skill is a folder containing a <code>SKILL.md</code> file — a name, a one-line description
            and a set of instructions — plus any scripts, templates or reference files those instructions use.
            The assistant reads only the short description up front, and loads the full instructions when a
            request matches it. That keeps dozens of skills available without filling the context window.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Skills vs. MCP servers</h2>
          <p>
            They solve different problems and work well together. An{" "}
            <Link href="/mcps" className="text-brand hover:underline">
              MCP server
            </Link>{" "}
            gives the assistant new <em>capabilities</em>: tools it can call to reach a database, a browser or an
            API. A skill gives it <em>know-how</em>: how your team writes a changelog, how to fill in a particular
            spreadsheet, which steps a code review should follow. A skill can tell the assistant to use an MCP
            server&apos;s tools in a specific way.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">How to install a skill in Claude Code</h2>
          <p>Skills are distributed through plugin marketplaces, which are ordinary GitHub repositories:</p>
          <CodeBlock
            className="mt-3"
            language="bash"
            code={"/plugin marketplace add anthropics/skills\n/plugin install document-skills@anthropic-agent-skills"}
          />
          <p className="mt-3">
            Run these inside a Claude Code session. You can also drop a skill folder into{" "}
            <code>.claude/skills/</code> in a project, or <code>~/.claude/skills/</code> for every project.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">In Claude, Cursor and Codex</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Claude (app and desktop):</span> upload the skill folder under
              Settings → Capabilities → Skills.
            </li>
            <li>
              <span className="text-foreground">Cursor:</span> there is no native skill format; paste the{" "}
              <code>SKILL.md</code> instructions into a rule under <code>.cursor/rules/</code>.
            </li>
            <li>
              <span className="text-foreground">Codex and other agents:</span> reference the instructions from{" "}
              <code>AGENTS.md</code> at the repository root.
            </li>
          </ul>
          <p className="mt-3">Every skill page in the catalog has these steps written out for that skill.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Are skills safe?</h2>
          <p>
            A skill is instructions plus, often, scripts the assistant may run. Read the <code>SKILL.md</code> and
            any scripts before installing one from a source you don&apos;t know — the same care you would take with
            any code you execute.
          </p>
        </section>
      </article>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <h2 className="mb-4 text-lg font-semibold">Most-starred skills</h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((s) => (
            <li key={s.id}>
              <ResourceCard item={skillToCard(s)} />
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/skills" className="inline-flex items-center gap-1 text-brand hover:underline">
            Browse all {skills.length.toLocaleString("en-US")} skills <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      </section>
    </>
  );
}
