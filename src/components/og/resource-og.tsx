import { ImageResponse } from "next/og";
import type { ResourceKind } from "@/lib/types";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const KIND_LABEL: Record<ResourceKind, string> = {
  skills: "Agent Skill",
  mcps: "MCP Server",
  repos: "GitHub Repo",
};

/**
 * Per-resource share card. Every detail page previously reused one generic
 * site-wide image, so a shared link to a specific server looked identical to
 * the homepage — which is exactly the moment a preview needs to be specific.
 *
 * Note this uses Satori (not a browser), which supports only a flexbox subset
 * of CSS: every element with more than one child needs an explicit `display`,
 * and there is no `gap` shorthand inheritance to rely on.
 */
export function renderResourceOg({
  kind,
  title,
  description,
  meta,
}: {
  kind: ResourceKind;
  title: string;
  description: string;
  meta?: string;
}) {
  // Satori font-matches per glyph and tries to fetch a font for anything
  // outside the embedded set — decorative symbols in registry titles (★, ☆,
  // emoji) fail that fetch and render as tofu. Drop them up front.
  const sanitize = (v: string) =>
    v
      .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const safeTitle = sanitize(title) || "Untitled";
  const safeDescription = sanitize(description);
  const clipped =
    safeDescription.length > 150 ? `${safeDescription.slice(0, 149)}…` : safeDescription;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0a0a12",
          backgroundImage:
            "radial-gradient(1000px circle at 15% 15%, rgba(124,107,255,0.28), transparent 45%), radial-gradient(900px circle at 90% 85%, rgba(34,211,238,0.22), transparent 45%)",
          color: "#f5f5fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: "linear-gradient(100deg, #7c6bff, #22d3ee)",
            }}
          />
          <div style={{ fontSize: 28, color: "#a5b4fc", fontWeight: 600 }}>AI Library</div>
          <div style={{ fontSize: 28, color: "#4b5578" }}>/</div>
          <div style={{ fontSize: 28, color: "#8b95ad" }}>{KIND_LABEL[kind]}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: safeTitle.length > 34 ? 62 : 76,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              // Satori has no line-clamp; the length-based size step above
              // keeps long names inside the card instead.
              maxHeight: 180,
              overflow: "hidden",
            }}
          >
            {safeTitle}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 30,
              lineHeight: 1.4,
              color: "#9aa4bf",
              maxHeight: 130,
              overflow: "hidden",
            }}
          >
            {clipped}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, color: "#6b7699" }}>{meta ? sanitize(meta) : ""}</div>
          <div style={{ fontSize: 24, color: "#6b7699" }}>Copy-paste setup for every AI client</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
