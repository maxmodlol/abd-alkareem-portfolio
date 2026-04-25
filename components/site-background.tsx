export function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#02040a]" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-80" />
      <div className="vignette absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-radial-hero" />
      <div
        className="bg-grid-anim absolute inset-0 opacity-[0.4]"
        style={{
          maskImage:
            "radial-gradient(ellipse 85% 60% at 50% 0%, black, transparent 72%)",
        }}
      />
      <div
        className="bg-grid-fine absolute inset-0 opacity-25"
        style={{
          maskImage:
            "radial-gradient(ellipse 100% 70% at 50% 20%, black, transparent 60%)",
        }}
      />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div
        className="texture-grain absolute inset-0 mix-blend-overlay opacity-40"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
