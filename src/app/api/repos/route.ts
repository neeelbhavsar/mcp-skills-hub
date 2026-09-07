import { repos, meta } from "@/lib/data";
import { SITE_URL, resourcePath } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      updatedAt: meta.updatedAt,
      count: repos.length,
      repos: repos.map((r) => ({
        slug: r.slug,
        name: r.name,
        fullName: r.fullName,
        description: r.description,
        category: r.category,
        language: r.language,
        stars: r.stars,
        topics: r.topics,
        repoUrl: r.url,
        url: `${SITE_URL}${resourcePath("repos", r.slug)}`,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
