import type { Metadata, Viewport } from "next";
import { RootProviders } from "./providers";
import "./globals.css";

const SITE_URL = process.env.NEXTAUTH_URL || "https://mainframe-hq.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mainframe HQ — Candelaria Agency Operations",
    template: "%s | Candelaria Agency",
  },
  description: "Interne operations-portal van Candelaria Agency.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a7f3f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="bg-brand-white text-brand-black">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
