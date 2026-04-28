import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { getSiteUrl } from "@/lib/site";

import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const siteName = "Abd Alkareem Abu-Alsoud";
const siteDescription =
  "Backend-leaning full-stack software engineer building SaaS platforms, APIs, CRM systems, integrations, and web/mobile products.";
const keywords: string[] = [
  "Full Stack Developer",
  "Backend Engineer",
  "Next.js Developer",
  "Node.js Developer",
  "NestJS",
  "Spring Boot",
  "React",
  "Flutter",
  "SaaS",
  "CRM",
  "Palestine",
  "Remote Developer",
];
const defaultTitle = `${siteName} | Full-Stack Software Engineer`;

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  applicationName: siteName,
  description: siteDescription,
  keywords,
  authors: [{ name: siteName, url: "https://github.com/maxmodlol" }],
  creator: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: defaultTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: siteDescription,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  formatDetection: { email: true, address: true, telephone: true },
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  themeColor: "#030303",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${syne.variable} min-h-screen font-sans`}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
