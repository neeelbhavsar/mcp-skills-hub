import type { Metadata } from "next";
import { skills, meta, categoriesOf } from "@/lib/data";
import { skillToCard } from "@/lib/view";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { PageHeader } from "@/components/layout/page-header";
import { breadcrumbJsonLd, collectionJsonLd, OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Browse AI skills for Claude, Cursor, Codex and more. Learn how to install and use each one in any assistant.";

export const metadata: Metadata = {
  title: "AI Skills",
  description: DESCRIPTION,
  alternates: { canonical: "/skills" },
  openGraph: { url: "/skills", title: "AI Skills — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function SkillsPage() {
  const items = skills.map(skillToCard);
  const cats = categoriesOf(meta.categories.skills);
  const jsonLd = [
    breadcrumbJsonLd([{ name: "Skills", path: "/skills" }]),
    collectionJsonLd("skills", DESCRIPTION),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Agent Skills"
        title="Supercharge your AI with"
        highlight="Skills"
        subtitle="Reusable capabilities that teach your assistant a domain — from document processing to design. Add them to Claude Code, Cursor, Codex and beyond with copy-paste steps."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <CatalogShell items={items} categories={cats} />
      </section>
    </>
  );
}
