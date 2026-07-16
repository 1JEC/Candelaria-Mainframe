import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mainframe HQ — Candelaria Agency Operations",
  description: "Internal operations portal for Candelaria Agency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-brand-white text-brand-black">
        {children}
      </body>
    </html>
  );
}
