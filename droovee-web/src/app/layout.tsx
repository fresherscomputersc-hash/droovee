import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Droovee — Book a professional driver for your own car",
  description: "Hourly, half-day, full-day, outstation, airport and monthly driver booking in Bhubaneswar. Open 24×7.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
