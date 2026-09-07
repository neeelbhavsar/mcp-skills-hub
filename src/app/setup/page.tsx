import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { SetupBuilder } from "@/components/cart/setup-builder";
import { OG_IMAGE } from "@/lib/seo";

const DESCRIPTION =
  "Pick the MCP servers you want and get one merged config for Claude, Cursor, VS Code, Windsurf, Cline or Codex — no hand-editing JSON.";

export const metadata: Metadata = {
  title: "Setup Builder",
  description: DESCRIPTION,
  alternates: { canonical: "/setup" },
  openGraph: { url: "/setup", title: "Setup Builder — AI Library", description: DESCRIPTION, images: [OG_IMAGE] },
};

export default function SetupPage() {
  return (
    <>
      <PageHeader
        eyebrow="Setup Builder"
        title="Configure every server in"
        highlight="one file"
        subtitle="Tick servers as you browse the catalog. This page merges them into a single config for whichever client you use — including the mcp-remote bridges where your client needs them."
      />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <SetupBuilder />
      </section>
    </>
  );
}
