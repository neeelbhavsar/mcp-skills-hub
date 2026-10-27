import { getMcp, mcps } from "@/lib/data";
import { healthOf } from "@/lib/health";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return mcps.map((m) => ({ slug: m.slug }));
}

const COLORS: Record<string, string> = { A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626" };

/** Rough text width for Verdana 11px, the shields.io convention. */
const width = (text: string) => Math.round(text.length * 6.6 + 12);

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * "MCP Skills Hub | health A 87" — a README badge for the authors of listed
 * servers. Every badge links back to the listing, which is the cheapest way
 * for a directory to earn links from the projects it covers.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mcp = getMcp(slug);
  const health = mcp ? healthOf(mcp) : null;
  const left = "MCP Skills Hub";
  const right = health?.grade ? `health ${health.grade} ${health.score}` : "listed";
  const color = health?.grade ? COLORS[health.grade] : "#7c6bff";
  const lw = width(left);
  const rw = width(right);
  const total = lw + rw;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${escapeXml(`${left}: ${right}`)}">
<title>${escapeXml(`${left}: ${right}`)}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#3b3f5c"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/><rect width="${total}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14">${escapeXml(left)}</text><text x="${lw + rw / 2}" y="14">${escapeXml(right)}</text>
</g></svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
