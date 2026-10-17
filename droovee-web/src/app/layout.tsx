import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Droovee — Book a professional driver for your own car",
  description:
    "Book trained, verified drivers for your own car in Bhubaneswar. Hourly, outstation, airport, and late-night sober drivers. 24x7 doorstep dispatch.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}