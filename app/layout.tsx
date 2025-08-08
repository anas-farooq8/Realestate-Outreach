import type React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Real Estate Outreach Automation",
  description:
    "Automate your real estate outreach with AI-powered community data enrichment",
  generator: "v0.dev",
  applicationName: "RealEstate OutReach",
  keywords: ["real estate", "outreach", "automation", "AI", "productivity"],
  authors: [{ name: "Total Body Mobile Massage" }],
  creator: "Total Body Mobile Massage Outreach Team",
  publisher: "Total Body Mobile Massage",
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RE OutReach",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "RE OutReach",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.className} touch-manipulation tap-highlight-none`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <Navbar>{children}</Navbar>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
