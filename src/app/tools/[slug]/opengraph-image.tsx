import { notFound } from "next/navigation";
import { getToolPage } from "@/lib/data";
import { renderResourceOg, OG_SIZE, OG_CONTENT_TYPE } from "@/components/og/resource-og";
import { SITE_NAME } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Rendered on first request and cached at the edge rather than prebuilt —
// see app/mcps/[slug]/opengraph-image.tsx.
export const dynamicParams = true;

export const alt = `MCP tool on ${SITE_NAME}`;

/** Tool pages all shared the site-wide card, so 950 links unfurled identically. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) notFound();
  const servers = page.providers.map((p) => p.server.name);
  return renderResourceOg({
    kind: "tools",
    title: page.name,
    description: page.providers.find((p) => p.description)?.description ?? `An MCP tool exposed by ${servers.join(", ")}.`,
    meta: servers.length === 1 ? servers[0] : undefined,
    badges: [`${servers.length} server${servers.length === 1 ? "" : "s"}`],
  });
}
