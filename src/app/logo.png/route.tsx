import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/**
 * Square brand mark for the Organization schema. `logo` previously pointed at
 * the 1200×630 share card, which is the wrong shape for every place a logo is
 * displayed (Google wants a square-ish mark of at least 112px).
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c6bff, #22d3ee)",
          borderRadius: 96,
        }}
      >
        <div style={{ display: "flex", fontSize: 220, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em" }}>
          MSH
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
