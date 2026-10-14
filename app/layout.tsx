import type { Metadata, Viewport } from "next";
import { Fragment_Mono, Gabarito, Hanken_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { getSiteUrl } from "@/lib/site";

import "./globals.css";

const gabarito = Gabarito({
  variable: "--font-gabarito",
  subsets: ["latin"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const fragmentMono = Fragment_Mono({
  variable: "--font-fragment",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
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
  themeColor: "#0b3039",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${gabarito.variable} ${hanken.variable} ${fragmentMono.variable}`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
