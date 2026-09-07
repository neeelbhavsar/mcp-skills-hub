import { mcps, meta } from "@/lib/data";
import { serverEntry } from "@/lib/ai-targets";
import { launchFor } from "@/lib/compat";
import { trustSignals, overallLevel } from "@/lib/trust";
import { SITE_URL, resourcePath } from "@/lib/seo";

// Statically generated at build time — this is a file, not a running service.
export const dynamic = "force-static";

/**
 * Machine-readable catalog. Exists so agents (and the directory's own MCP
 * server) can query the data without scraping HTML.
 */
export function GET() {
  const payload = {
    updatedAt: meta.updatedAt,
    count: mcps.length,
    servers: mcps.map((m) => ({
      slug: m.slug,
      name: m.name,
      qualifiedName: m.qualifiedName,
      description: m.description,
      category: m.category,
      url: `${SITE_URL}${resourcePath("mcps", m.slug)}`,
      repository: m.repository,
      stars: m.stars,
      launch: launchFor(m),
      configKey: serverEntry(m).key,
      trust: overallLevel(trustSignals(m)),
      signals: trustSignals(m).map((s) => ({ level: s.level, label: s.label })),
    })),
  };

  return Response.json(payload, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
