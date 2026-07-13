import type { Metadata } from "next";
import { skills, meta, categoriesOf } from "@/lib/data";
import { skillToCard } from "@/lib/view";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "AI Skills — AI Library",
  description: "Browse AI skills for Claude, Cursor, Codex and more. Learn how to install and use each one in any assistant.",
};

export default function SkillsPage() {
  const items = skills.map(skillToCard);
  const cats = categoriesOf(meta.categories.skills);
  return (
    <>
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
