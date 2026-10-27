/**
 * Unknown /.well-known/* paths. Agents probe dozens of these (ai-catalog.json,
 * mcp.json, agent-card.json, OAuth metadata…); each miss used to render the
 * full HTML 404 page. A real 404, just a small one.
 */
export function GET() {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
