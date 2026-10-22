import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Droovee — Book a professional driver for your own car",
  description:
    "Book trained, verified drivers for your own car in Bhubaneswar. Hourly, outstation, airport, and monthly office drivers. 24x7 doorstep dispatch.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Droovee",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className="h-full">
      <body className="flex min-h-full flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}