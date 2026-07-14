import { ImageResponse } from "next/og";

// Branded social-share card, rendered to PNG at build time and reused as the
// og:image (and Twitter image fallback) across every route.
export const alt = "AI Library — Skills, MCP servers & GitHub repos for every AI assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a12",
          backgroundImage:
            "radial-gradient(1000px circle at 15% 15%, rgba(124,107,255,0.28), transparent 45%), radial-gradient(900px circle at 90% 85%, rgba(34,211,238,0.22), transparent 45%)",
          color: "#f5f5fa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 30,
            color: "#a5b4fc",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "linear-gradient(120deg, #7c6bff, #22d3ee)",
            }}
          />
          AI LIBRARY
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: 920,
          }}
        >
          Skills, MCP servers &amp; repos for every AI assistant
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 32,
            color: "#b9b9c6",
            maxWidth: 900,
          }}
        >
          Copy-paste setup for Claude, Cursor, Codex, Windsurf &amp; more — refreshed daily.
        </div>
      </div>
    ),
    { ...size }
  );
}
