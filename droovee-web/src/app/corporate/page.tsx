import type { Metadata } from "next";
import { ServicePage } from "@/components/ServicePage";

export const metadata: Metadata = {
  title: "Corporate Driver & Fleet Chauffeur Services in Bhubaneswar | Droovee",
  description:
    "Dedicated corporate drivers for companies, institutions, hospitals & executive fleets in Bhubaneswar. Uniformed professional chauffeurs, monthly corporate billing & GST invoices.",
  alternates: {
    canonical: "https://droovee.com/corporate",
  },
  openGraph: {
    title: "Corporate Driver & Fleet Chauffeur Services in Bhubaneswar | Droovee",
    description:
      "Professional corporate driver services for businesses and institutions across Bhubaneswar. Consistent drivers, monthly invoicing and dedicated dispatch desk.",
    url: "https://droovee.com/corporate",
    images: [{ url: "/services/corporate.jpg", width: 1200, height: 630, alt: "Corporate driver services in Bhubaneswar" }],
  },
};

export default function CorporatePage() {
  return (
    <ServicePage
      content={{
        label: "Corporate",
        href: "/corporate",
        eyebrow: "Corporate",
        title: "Corporate driver services in Bhubaneswar",
        intro:
          "Dedicated commute drivers for offices, hospitals and institutions — with monthly billing and GST invoices for your finance team.",
        image: {
          src: "/services/corporate.jpg",
          alt: "Droovee chauffeur driving a corporate passenger who is working on a laptop",
        },
        bookHref: "/book?service=monthly_office",
        bookLabel: "Book a corporate plan",
        highlights: [
          {
            title: "Dedicated drivers",
            text: "The same chauffeur for your team's daily office runs, not a new face each day.",
          },
          {
            title: "Monthly invoicing",
            text: "Consolidated billing with a GST invoice each month.",
          },
          {
            title: "Route familiarity",
            text: "Drivers who learn your pickup points, timings and building entrances.",
          },
          {
            title: "Dispatch support",
            text: "A 24x7 desk on phone and WhatsApp for schedule changes.",
          },
        ],
        steps: [
          {
            title: "Tell us your requirement",
            text: "Share your routes, timings and working days with our team.",
          },
          {
            title: "We assign drivers",
            text: "Dispatch matches verified chauffeurs to each route.",
          },
          {
            title: "Monthly settlement",
            text: "One bill per month, with a GST invoice for your accounts.",
          },
        ],
        notes: [
          "Built for offices, hospitals, showrooms and institutions.",
          "Fuel, tolls and parking are paid by you.",
          "Corporate pricing is quoted after sign-in — call or WhatsApp dispatch to plan.",
        ],
      }}
    />
  );
}
