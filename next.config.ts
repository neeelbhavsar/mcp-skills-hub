import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Vercel preview deployments serve the same pages at *.vercel.app URLs of
 * their own. Without this, a preview linked from a PR can be indexed as a
 * duplicate of the live site.
 */
const isPreview = !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production";

/**
 * Content Security Policy. Scripts allow 'unsafe-inline' because Next.js
 * streams its RSC payload and the theme bootstrap as inline scripts; a
 * nonce-based policy would force every page to render dynamically. The rest
 * is locked down: no plugins, no framing, no third-party script origins.
 * Dev mode needs 'unsafe-eval' for React's debugging, so the policy is
 * production-only.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // RFC 9727: agents can find the API from any response, not just the HTML.
  { key: "Link", value: '</.well-known/api-catalog>; rel="api-catalog"' },
  ...(isPreview ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
];

const LISTINGS = ["mcps", "skills", "repos"];

const nextConfig: NextConfig = {
  // Lets the dev server be reached through an ngrok tunnel. This used to sit
  // in a stray `module.exports` next to the default export.
  allowedDevOrigins: ["0a8d-27-54-182-197.ngrok-free.app"],

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  /**
   * `?page=N` links (the shape people and old tooling expect) go to the
   * crawlable path-segment pages, so each page keeps one canonical URL.
   * `?page=1` needs no rule: it is /mcps itself, whose canonical already says
   * so — and redirecting /mcps to /mcps would loop, since the query is kept.
   */
  async redirects() {
    return LISTINGS.map((kind) => ({
      source: `/${kind}`,
      has: [{ type: "query" as const, key: "page", value: "(?<n>[2-9]|[1-9]\\d+)" }],
      destination: `/${kind}/page/:n`,
      permanent: true,
    }));
  },
};

export default nextConfig;
