import type { Metadata } from "next";
import { ServicePage } from "@/components/ServicePage";

export const metadata: Metadata = {
  title: "Monthly driver in Bhubaneswar — Droovee",
  description:
    "A monthly driver for your daily office run, school drop or hospital visits in Bhubaneswar. The same verified chauffeur, monthly billing and a GST invoice.",
};

export default function MonthlyPage() {
  return (
    <ServicePage
      content={{
        label: "Monthly",
        href: "/monthly",
        eyebrow: "Monthly",
        title: "Monthly driver for your daily commute",
        intro:
          "The same trusted driver for your office run, school drop or hospital visits. Set your working days and timings once.",
        image: {
          src: "/services/monthly.jpg",
          alt: "Droovee chauffeur driving a regular customer on their daily commute",
        },
        bookHref: "/book?service=monthly_office",
        bookLabel: "Book a monthly plan",
        highlights: [
          {
            title: "Same driver daily",
            text: "One verified chauffeur who learns your route, timings and preferences.",
          },
          {
            title: "Fixed schedule",
            text: "Set your working days and pickup times once and keep them.",
          },
          {
            title: "Monthly billing",
            text: "One consolidated bill instead of paying trip by trip.",
          },
          {
            title: "GST invoice",
            text: "A GST invoice every month, ready for your accounts.",
          },
        ],
        steps: [
          {
            title: "Set your schedule",
            text: "Choose your pickup, drop, working days and timings.",
          },
          {
            title: "Driver assigned",
            text: "Dispatch matches a verified chauffeur to your route.",
          },
          {
            title: "Billed monthly",
            text: "Pay monthly by cash or UPI, with the invoice following.",
          },
        ],
        notes: [
          "Ideal for offices, hospitals, schools and daily commuters.",
          "Fuel, tolls and parking are paid by you.",
          "Monthly pricing is shown after you sign in.",
        ],
      }}
    />
  );
}
