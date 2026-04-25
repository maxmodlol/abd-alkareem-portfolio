import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "grid-drift": {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(-50px, -50px)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(0, -8px) scale(1.02)" },
        },
        "orb-1": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(30px, -20px)" },
        },
        "orb-2": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-25px, 15px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.75" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "border-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "grid-drift": "grid-drift 40s linear infinite",
        float: "float 6s ease-in-out infinite",
        "orb-1": "orb-1 18s ease-in-out infinite",
        "orb-2": "orb-2 22s ease-in-out infinite",
        "pulse-soft": "pulseSoft 4s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
        shimmer: "shimmer 8s linear infinite",
        "border-glow": "border-glow 5s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial-hero":
          "radial-gradient(ellipse 100% 80% at 50% -20%, rgba(6, 182, 212, 0.18), transparent 55%)",
        "gradient-mesh":
          "radial-gradient(at 20% 20%, rgba(6, 182, 212, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 45%)",
      },
    },
  },
  plugins: [],
};

export default config;
