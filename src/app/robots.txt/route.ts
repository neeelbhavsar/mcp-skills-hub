import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * robots.txt as a route handler rather than `robots.ts`, because the metadata
 * API can't emit a Content-Signal line.
 *
 * - Everything is crawlable: this is a public directory that wants to be
 *   found, cited and used by agents. /api/ stays allowed on purpose — agents
 *   are pointed at it from llms.txt and the API catalog.
 * - AI crawlers get named groups so the policy is explicit rather than
 *   implied by `*`.
 * - Content-Signal (contentsignals.org, a draft) states the usage preference:
 *   search, AI answers and training are all welcome.
 * - The old non-standard `Host:` line is gone; Google and Bing ignore it.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export function GET() {
  const body = [
    "User-agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    "Allow: /",
    "",
    ...AI_AGENTS.map((a) => `User-agent: ${a}`),
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
