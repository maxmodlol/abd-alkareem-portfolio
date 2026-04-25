import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

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

export const metadata: Metadata = {
  title: `${siteName} | Full-Stack Software Engineer`,
  description: siteDescription,
  keywords,
  authors: [{ name: siteName, url: "https://github.com/maxmodlol" }],
  openGraph: {
    title: `${siteName} | Full-Stack Software Engineer`,
    description: siteDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Full-Stack Software Engineer`,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
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
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
