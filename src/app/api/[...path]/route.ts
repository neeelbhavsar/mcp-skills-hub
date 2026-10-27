/** Unknown API paths: a JSON 404 rather than the HTML page, so clients can parse it. */
export function GET() {
  return Response.json(
    { error: "not_found", endpoints: ["/api/mcps", "/api/skills", "/api/repos"], docs: "/developers" },
    { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
