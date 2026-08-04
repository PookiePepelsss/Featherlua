import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Featherlua",
  description: "A private Luau compressor for Roblox and Roblox executor scripts.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
