import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon: same mark, no rounding (iOS applies its own mask). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff9f1c 0%, #ff4d6d 100%)",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="11" rx="5.5" />
          <path d="M7 11v3M5.5 12.5h3" />
          <circle cx="16" cy="11.5" r="0.9" fill="white" stroke="none" />
          <circle cx="18.5" cy="13.5" r="0.9" fill="white" stroke="none" />
        </svg>
      </div>
    ),
    size
  );
}
