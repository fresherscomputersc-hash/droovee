import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How Droovee Works — Safe & Simple Driver Booking for Your Car | Droovee",
  description:
    "Learn how Droovee works in 6 easy steps: Choose your trip, get a police-verified driver assigned, start with a 4-digit OTP, travel in your own car, and pay after completion.",
  alternates: {
    canonical: "https://droovee.com/how-it-works",
  },
  openGraph: {
    title: "How Droovee Works — Safe & Simple Driver Booking for Your Car",
    description:
      "Step-by-step guide to hiring a professional chauffeur for your personal vehicle in Bhubaneswar. Safe, transparent, and verified.",
    url: "https://droovee.com/how-it-works",
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
