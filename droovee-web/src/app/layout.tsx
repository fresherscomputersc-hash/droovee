import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { OrganizationAndLocalBusinessJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL("https://droovee.com"),
  title: {
    default: "Droovee — Professional Chauffeurs for Your Own Car | Bhubaneswar",
    template: "%s | Droovee",
  },
  description:
    "Hire background-verified, police-checked professional drivers for your own car in Bhubaneswar & across Odisha. Hourly city errands, outstation trips to Puri & Cuttack, airport transfers, and monthly office commutes. Book in 60 seconds with 24x7 dispatch.",
  keywords: [
    "driver for rent in bhubaneswar",
    "hire personal driver bhubaneswar",
    "driver for my own car",
    "driver on demand bhubaneswar",
    "hourly driver bhubaneswar",
    "outstation driver to puri",
    "outstation driver to cuttack",
    "airport driver transfer bhubaneswar",
    "monthly driver service bhubaneswar",
    "corporate chauffeur bhubaneswar",
    "car driver hire odisha",
  ],
  authors: [{ name: "Droovee Mobility", url: "https://droovee.com" }],
  creator: "Droovee",
  publisher: "Droovee",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "Droovee — Professional Chauffeurs for Your Own Car in Bhubaneswar",
    description:
      "Skip cab hassles. Book background-verified, uniformed professional chauffeurs on demand for your own vehicle across Bhubaneswar and Odisha.",
    url: "https://droovee.com",
    siteName: "Droovee",
    images: [
      {
        url: "/launch-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Droovee — Professional Driver Service for Your Own Car in Bhubaneswar",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Droovee — Professional Chauffeurs for Your Own Car",
    description:
      "Book verified professional drivers for your personal vehicle in Bhubaneswar. Hourly, outstation, airport, and monthly office plans.",
    images: ["/launch-hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
  themeColor: "#001433",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className="h-full">
      <body className="flex min-h-full flex-col">
        <OrganizationAndLocalBusinessJsonLd />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}