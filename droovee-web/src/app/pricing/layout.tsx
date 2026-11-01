import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Driver Rates & Fare Calculator in Bhubaneswar | Droovee",
  description:
    "Transparent pricing and live fare calculator for hiring drivers for your own car in Bhubaneswar. Zero surge pricing, no hidden driver allowances, and no advance payment.",
  alternates: {
    canonical: "https://droovee.com/pricing",
  },
  openGraph: {
    title: "Driver Rates & Fare Calculator in Bhubaneswar | Droovee",
    description:
      "Calculate your driver booking fare in Bhubaneswar with flat transparent rates and zero surge fees.",
    url: "https://droovee.com/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
