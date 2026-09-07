import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { paletteIndex } from "@/lib/data";
import { themeInitScript } from "@/components/layout/theme-toggle";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "The all-in-one directory of AI Skills, MCP servers, and GitHub repos for Claude, Cursor, Codex and more. Refreshed daily. Learn how to use each one in any AI.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Library — Skills, MCPs & Repos for every AI assistant",
    template: "%s · AI Library",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI skills",
    "MCP servers",
    "Model Context Protocol",
    "Claude",
    "Cursor",
    "Codex",
    "Windsurf",
    "Cline",
    "GitHub",
    "AI agents",
    "developer tools",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: "AI Library — Skills, MCPs & Repos for every AI assistant",
    description: "All-in-one directory of AI Skills, MCP servers & repos. Refreshed daily.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Library",
    description: "All-in-one directory of AI Skills, MCP servers & repos. Refreshed daily.",
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
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: absoluteUrl("/opengraph-image"),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <Nav searchIndex={paletteIndex} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
