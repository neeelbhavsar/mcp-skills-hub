import { skills, meta } from "@/lib/data";
import { SITE_URL, resourcePath } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      updatedAt: meta.updatedAt,
      count: skills.length,
      skills: skills.map((s) => ({
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        author: s.author,
        repo: s.repo,
        sourceUrl: s.sourceUrl,
        stars: s.stars,
        url: `${SITE_URL}${resourcePath("skills", s.slug)}`,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
