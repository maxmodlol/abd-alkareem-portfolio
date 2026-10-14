import { ImageResponse } from "next/og";

export const alt = "Abd Alkareem Abu-Alsoud, Full-Stack Software Engineer";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const fontStack = "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(180deg, #0b3039 0%, #22838a 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: "#f25c54" }} />
          <span style={{ fontSize: 30, color: "#fff8ee", fontFamily: fontStack }}>
            Abd Alkareem Abu-Alsoud
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            color: "#fff8ee",
            fontFamily: fontStack,
            maxWidth: 900,
          }}
        >
          Products are cities. I build the plumbing.
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 28, color: "#cfe9ea", fontFamily: fontStack }}>
          Full-stack engineer. SaaS, CRM and mobile products.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
