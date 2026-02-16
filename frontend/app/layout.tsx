import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CF:ICPC — Training Platform",
  description:
    "ICPC training platform with curated Codeforces problems, skill tree, and team progress tracking",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#e0aa0f",
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
        className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <Header />
        <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-10">{children}</main>
      </body>
    </html>
  );
}
