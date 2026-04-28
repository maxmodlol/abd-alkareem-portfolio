import { ImageResponse } from "next/og";

export const alt = "Abd Alkareem Abu-Alsoud — Full-Stack Software Engineer";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#030303",
          backgroundImage:
            "linear-gradient(145deg, #030303 0%, #0c0a12 45%, #030303 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#dfff00",
              boxShadow: "0 0 48px rgba(223,255,0,0.35)",
            }}
          />
          <span
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#fafafa",
              letterSpacing: "-0.03em",
              fontFamily:
                "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial",
            }}
          >
            Abd Alkareem
          </span>
        </div>
        <p
          style={{
            fontSize: 26,
            color: "#a1a1aa",
            margin: 0,
            fontFamily:
              "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial",
          }}
        >
          Full-Stack Software Engineer
        </p>
        <p
          style={{
            marginTop: 28,
            fontSize: 18,
            color: "#71717a",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
          }}
        >
          SaaS · APIs · CRM · Next.js
        </p>
      </div>
    ),
    {
      ...size,
    },
  );
}
