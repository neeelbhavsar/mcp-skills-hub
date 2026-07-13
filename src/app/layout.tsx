import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";

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

export const metadata: Metadata = {
  title: "AI Library — Skills, MCPs & Repos for every AI assistant",
  description:
    "The all-in-one directory of AI Skills, MCP servers, and GitHub repos for Claude, Cursor, Codex and more. Refreshed daily. Learn how to use each one in any AI.",
  keywords: ["AI skills", "MCP servers", "Claude", "Cursor", "Codex", "GitHub", "developer tools"],
  openGraph: {
    title: "AI Library",
    description: "All-in-one directory of AI Skills, MCP servers & repos. Refreshed daily.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
