import { ImageResponse } from "next/og";

// Home-screen icon for iPhone and iPad. iOS rounds the corners itself, so the
// background fills the square and the mark sits inside it.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F3EEFF" }}>
        <svg width="180" height="180" viewBox="0 0 48 48">
          <path d="M10 21 L24 10 L38 21 Z" fill="#6D28D9" stroke="#6D28D9" strokeWidth="2" strokeLinejoin="round" />
          <rect x="12" y="23" width="24" height="5" rx="1.5" fill="#4C1D95" />
          <rect x="12" y="30" width="24" height="5" rx="1.5" fill="#7C3AED" />
          <rect x="12" y="37" width="24" height="5" rx="1.5" fill="#C4B5FD" />
        </svg>
      </div>
    ),
    size,
  );
}
