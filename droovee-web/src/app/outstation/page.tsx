import type { Metadata } from "next";
import { ServicePage } from "@/components/ServicePage";

export const metadata: Metadata = {
  title: "Outstation driver from Bhubaneswar — Droovee",
  description:
    "One-way and round-trip drivers from Bhubaneswar to Puri, Cuttack, Konark and beyond. A verified highway chauffeur for your own car.",
};

export default function OutstationPage() {
  return (
    <ServicePage
      content={{
        label: "Outstation",
        href: "/outstation",
        eyebrow: "Outstation",
        title: "Outstation driver from Bhubaneswar",
        intro:
          "One-way or round-trip drivers to Puri, Cuttack, Konark and beyond. Your car, a verified highway driver, and a schedule you set.",
        image: {
          src: "/services/outstation.jpg",
          alt: "Droovee chauffeur on a highway drive out of Bhubaneswar",
        },
        bookHref: "/book?service=outstation_one_way",
        bookLabel: "Book an outstation trip",
        highlights: [
          {
            title: "One-way or round trip",
            text: "Book a single drop, or keep the same driver for the return leg.",
          },
          {
            title: "Highway experience",
            text: "Drivers used to long-distance routes, toll plazas and night driving.",
          },
          {
            title: "Night halt, quoted upfront",
            text: "Multi-day trips are charged per night and confirmed before you book.",
          },
          {
            title: "Return handled",
            text: "On one-way drops the driver makes their own way back to Bhubaneswar.",
          },
        ],
        steps: [
          {
            title: "Share your route",
            text: "Pick your destination, travel date and whether you need a round trip.",
          },
          {
            title: "Driver assigned",
            text: "Dispatch confirms a highway-experienced chauffeur for your car.",
          },
          {
            title: "Travel, then pay",
            text: "Settle by cash or UPI with the driver after the trip.",
          },
        ],
        notes: [
          "Tolls, parking and fuel are paid by you.",
          "You provide or reimburse the driver's food and overnight stay on outstation trips.",
          "Night halt is charged per night — the estimate is shown after you sign in.",
        ],
      }}
    />
  );
}
