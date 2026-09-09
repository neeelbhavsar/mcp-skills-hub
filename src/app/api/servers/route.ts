import { GET as mcpsRoute } from "../mcps/route";

export const dynamic = "force-static";

/**
 * Alias for /api/mcps. "servers" is the term the MCP ecosystem uses, so both
 * spellings resolve rather than one 404ing.
 */
export function GET() {
  return mcpsRoute();
}
