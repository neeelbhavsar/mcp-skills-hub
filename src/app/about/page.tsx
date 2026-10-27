import type { Metadata } from "next";
import Link from "next/link";
import { meta } from "@/lib/data";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE, REPO_URL, SITE_FORMER_NAME, SITE_NAME, SITE_URL, breadcrumbJsonLd, jsonLdScript, ogTitle } from "@/lib/seo";

const DESCRIPTION = `What ${SITE_NAME} is, who maintains it, where its data comes from and how it decides what to show.`;

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: ogTitle("About"), description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function AboutPage() {
  const total = meta.counts.skills + meta.counts.mcps + meta.counts.repos;
  const jsonLd = [
    breadcrumbJsonLd([{ name: "About", path: "/about" }]),
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      url: `${SITE_URL}/about`,
      name: `About ${SITE_NAME}`,
      about: { "@id": `${SITE_URL}/#organization` },
      dateModified: meta.updatedAt,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PageHeader eyebrow="About" title={`About ${SITE_NAME}`} highlight="" subtitle={DESCRIPTION} />

      <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-base leading-relaxed text-muted sm:px-6">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">What it is</h2>
          <p>
            {SITE_NAME} (formerly {SITE_FORMER_NAME}) is an open directory of {total.toLocaleString("en-US")} Model
            Context Protocol servers, Agent Skills and GitHub repositories for AI coding assistants. Every entry
            comes with the exact install configuration for Claude Code, Claude Desktop, Cursor, Codex, Windsurf,
            Cline and VS Code, so you can paste it rather than translate a README.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Who maintains it</h2>
          <p>
            It is built and maintained by{" "}
            <a href="https://neelbhavsar.vercel.app/" target="_blank" rel="noreferrer" className="text-brand hover:underline">
              Neel Bhavsar
            </a>
            , and the code is open source on{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              GitHub
            </a>
            . It is independent and not affiliated with Anthropic, OpenAI, Cursor or any listed project.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Where the data comes from</h2>
          <p>
            A pipeline runs every morning. It reads the official MCP Registry, the official reference servers,
            Anthropic&apos;s and the community&apos;s skill marketplaces, and GitHub. It enriches each entry from
            npm, PyPI and the source repository: maintenance activity, download counts, release history, the tools
            a server exposes (asked of the live server, or read from its documentation), and a static scan of what
            a package&apos;s code can reach. Nothing is edited by hand except a short list of curated corrections
            kept in the repository.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">How entries are judged</h2>
          <p>
            Each server gets a health score from published components and weights: maintenance, adoption,
            transparency, provenance and packaging. Anything that cannot be measured is left out rather than
            scored as zero. The score is not a security audit. The formula is on{" "}
            <Link href="/health-score" className="text-brand hover:underline">
              how the health score works
            </Link>
            , and it is open to argument.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Corrections</h2>
          <p>
            If a config does not work, a listing is wrong, or something should be added, the fastest route is{" "}
            <Link href="/submit" className="text-brand hover:underline">
              a GitHub issue
            </Link>
            . The data is also available as{" "}
            <Link href="/developers" className="text-brand hover:underline">
              a JSON API and an MCP server
            </Link>
            .
          </p>
        </section>
      </article>
    </>
  );
}
