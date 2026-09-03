import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Featherlua",
  description: "A private Luau compressor for Roblox and Roblox executor scripts.",
  icons: {
    icon: [
      // The vector first, so a browser that takes it stays sharp at any
      // size; the raster pair is the fallback for the ones that do not.
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Instrument Sans and JetBrains Mono, the two faces the design is
            drawn in. Both stacks in globals.css fall back to system fonts,
            so the page is legible before these arrive or if they never do. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
