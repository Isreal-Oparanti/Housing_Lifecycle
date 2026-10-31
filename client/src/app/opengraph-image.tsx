import { ImageResponse } from "next/og";

// The preview shown when a TrueCost link is shared (messages, social, Slack).
// Results pages are designed to be shared, so this is what most people see first.
export const alt = "TrueCost: the rent isn't the whole bill";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: "#FAF9F6",
          color: "#16132B",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 48 48">
            <rect width="48" height="48" rx="12" fill="#F3EEFF" />
            <path d="M10 21 L24 10 L38 21 Z" fill="#6D28D9" stroke="#6D28D9" strokeWidth="2" strokeLinejoin="round" />
            <rect x="12" y="23" width="24" height="5" rx="1.5" fill="#4C1D95" />
            <rect x="12" y="30" width="24" height="5" rx="1.5" fill="#7C3AED" />
            <rect x="12" y="37" width="24" height="5" rx="1.5" fill="#C4B5FD" />
          </svg>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>TrueCost</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            The rent isn&apos;t the whole bill.
          </div>
          <div style={{ fontSize: 34, color: "#3D3955" }}>
            See what a rental really costs each month, council tax included.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
