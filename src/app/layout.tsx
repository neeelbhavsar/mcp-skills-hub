import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { REPO_URL, SITE_FORMER_NAME, SITE_NAME, SITE_URL, absoluteUrl, jsonLdScript } from "@/lib/seo";
import { meta } from "@/lib/data";
import { CartProvider } from "@/components/cart/cart-provider";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { WebMcpTools } from "@/components/search/webmcp-tools";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Code blocks only — never above the fold, so not worth a preload. "optional"
// rather than "swap": swapping it in late shifted the install section (CLS
// 0.097 on mobile, attributed to "Web font loaded"). If it isn't ready almost
// immediately, code simply renders in the fallback monospace for that view.
const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "optional",
  preload: false,
});

const DESCRIPTION =
  "The directory of MCP servers, Agent Skills and GitHub repos for Claude, Cursor, Codex and more — with copy-paste setup for every AI client. Refreshed daily.";

const TITLE = `${SITE_NAME} — MCP Servers, Agent Skills & Repos for every AI assistant`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "MCP servers",
    "Model Context Protocol",
    "Agent Skills",
    "Claude",
    "Cursor",
    "Codex",
    "Windsurf",
    "Cline",
    "VS Code",
    "AI agents",
    "developer tools",
  ],
  authors: [{ name: SITE_NAME, url: REPO_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  // No site-wide canonical here: inherited by the 404 page, it told search
  // engines every missing URL was a copy of the home page. The home page sets
  // its own in page.tsx.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: "The directory of MCP servers, Agent Skills & repos, with copy-paste setup for every AI client. Refreshed daily.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "The directory of MCP servers, Agent Skills & repos, with copy-paste setup for every AI client. Refreshed daily.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Search Console ownership tokens. Both properties stay verified during the
  // Netlify -> Vercel move: the Change of Address tool requires the old and new
  // properties to be verified at the same time. Drop the Netlify token once the
  // move is complete and the old property is retired.
  verification: {
    google: [
      "LM7TGGW0KmAZdCaTkXkvystWoMLFbiibbjJkaSrFIXQ", // mcp-skills-hub.netlify.app
      "dGljOMTG_o7iFj2gJMQfh8Xzkk-2pc1HYRaTundNoO8", // Vercel
    ],
  },
};

/** Site-wide structured data (WebSite + Organization). */
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: SITE_FORMER_NAME,
      description: DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: SITE_FORMER_NAME,
      description: DESCRIPTION,
      url: `${SITE_URL}/`,
      // A square mark, not the 1200×630 share card it used to point at.
      logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png"), width: 512, height: 512 },
      sameAs: [REPO_URL],
      founder: { "@type": "Person", name: "Neel Bhavsar", url: "https://neelbhavsar.vercel.app/" },
    },
  ],
};

// Versioned by the data stamp: each daily build is a new cache key, so the
// indexes can be cached aggressively without ever going stale.
const v = encodeURIComponent(meta.updatedAt);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* RFC 9727 API discovery for agents. */}
        <link rel="api-catalog" href="/.well-known/api-catalog" />
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} — What's new`} href="/feed.xml" />
        <link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt" />
      </head>
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd) }} />
        <CartProvider indexUrl={`/index/setup.json?v=${v}`}>
          <Nav searchIndexUrl={`/index/palette.json?v=${v}`} />
          <WebMcpTools indexUrl={`/index/palette.json?v=${v}`} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
