import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — classic arcade games in your browser`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card shown when a link to the site is pasted into chat or social. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          background: "radial-gradient(60% 60% at 15% 20%, rgba(255,159,28,0.55) 0%, transparent 70%), radial-gradient(55% 55% at 85% 25%, rgba(13,148,136,0.5) 0%, transparent 70%), radial-gradient(60% 60% at 80% 85%, rgba(255,77,109,0.5) 0%, transparent 70%), #0a0a0d",
          color: "#f5f5f7",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: -0.5, opacity: 0.85 }}>
          Game<span style={{ color: "#ff9f1c" }}>Hub</span>
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 96, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>
          Play. Compete.{" "}
          <span
            style={{
              marginLeft: 22,
              background: "linear-gradient(135deg, #ff9f1c, #ff4d6d)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Repeat.
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 30, opacity: 0.7, maxWidth: 900, lineHeight: 1.35 }}>
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    size
  );
}
