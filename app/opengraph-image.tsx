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
          background: "radial-gradient(ellipse at 50% 120%, #2a3349 0%, #111521 45%, #090b10 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <div style={{ width: 56, height: 1, background: "#d7c68a" }} />
          <span style={{ fontSize: 26, color: "#d7c68a", letterSpacing: "0.32em", fontFamily: fontStack }}>
            ABD ALKAREEM ABU-ALSOUD
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 300,
            lineHeight: 1.06,
            letterSpacing: "-0.01em",
            color: "#ece6d6",
            fontFamily: fontStack,
            maxWidth: 900,
          }}
        >
          Products are cities. I build the plumbing.
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 28, color: "#9aa1b0", fontFamily: fontStack }}>
          Full-stack engineer. SaaS, CRM and mobile products.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
