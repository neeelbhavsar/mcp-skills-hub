import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

/** OpenAPI description of the three read-only catalog endpoints. */
export function GET() {
  const list = (summary: string, key: string) => ({
    get: {
      summary,
      responses: {
        "200": {
          description: "The full catalog, regenerated daily.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  updatedAt: { type: "string", format: "date-time" },
                  count: { type: "integer" },
                  [key]: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  });
  const spec = {
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} catalog API`,
      version: "1.0.0",
      description:
        "Read-only JSON for every MCP server, Agent Skill and GitHub repo in the directory, including generated install configs, trust signals, health scores and discovered tools. No key required; CORS open.",
    },
    servers: [{ url: SITE_URL }],
    paths: {
      "/api/mcps": list("All MCP servers, with launch config, health, trust signals and tools", "servers"),
      "/api/servers": list("Alias of /api/mcps", "servers"),
      "/api/skills": list("All Agent Skills", "skills"),
      "/api/repos": list("All GitHub repos", "repos"),
    },
  };
  return Response.json(spec, {
    headers: {
      "Content-Type": "application/openapi+json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
