import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Reviews & Testimonials — Verified Driver Service in Bhubaneswar | Droovee",
  description:
    "Read genuine reviews and ratings from car owners across Patia, Saheed Nagar, Khandagiri, and Bhubaneswar who hire Droovee drivers for city and outstation journeys.",
  alternates: {
    canonical: "https://droovee.com/testimonials",
  },
  openGraph: {
    title: "Customer Reviews & Testimonials — Verified Driver Service in Bhubaneswar | Droovee",
    description:
      "4.9/5 star ratings from over 1,000+ completed rides across Bhubaneswar and Odisha.",
    url: "https://droovee.com/testimonials",
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
