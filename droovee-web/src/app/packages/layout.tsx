import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Driver Packages & Fixed-Rate Plans in Bhubaneswar | Droovee",
  description:
    "Explore transparent driver packages in Bhubaneswar: Half-day shopping, full-day city runs, Puri weekend tours, and monthly office commute plans for your personal car.",
  alternates: {
    canonical: "https://droovee.com/packages",
  },
  openGraph: {
    title: "Driver Packages & Fixed-Rate Plans in Bhubaneswar | Droovee",
    description:
      "Transparent hourly and multi-day driver packages for your personal car across Bhubaneswar and Odisha.",
    url: "https://droovee.com/packages",
  },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
