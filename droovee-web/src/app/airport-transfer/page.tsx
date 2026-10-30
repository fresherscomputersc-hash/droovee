import type { Metadata } from "next";
import { ServicePage } from "@/components/ServicePage";

export const metadata: Metadata = {
  title: "Airport transfer in Bhubaneswar — Droovee",
  description:
    "Punctual airport, railway and bus-stop pickup and drop in Bhubaneswar. A verified driver for your own car, with 24x7 dispatch.",
};

export default function AirportTransferPage() {
  return (
    <ServicePage
      content={{
        label: "Airport transfer",
        href: "/airport-transfer",
        eyebrow: "Airport & station",
        title: "Airport transfer in Bhubaneswar",
        intro:
          "Punctual pickup and drop at Biju Patnaik Airport, the railway station and bus stops. Share your terminal and our dispatch desk handles the rest.",
        image: {
          src: "/services/airport-transfer.jpg",
          alt: "Droovee chauffeur helping a traveller with luggage outside Biju Patnaik Airport",
        },
        bookHref: "/book?service=airport_pickup_drop",
        bookLabel: "Book an airport transfer",
        highlights: [
          {
            title: "Airport, rail and bus",
            text: "Pickups and drops at Biju Patnaik Airport, the railway station and bus stops.",
          },
          {
            title: "Late landings covered",
            text: "A driver waits for you even when your flight lands later than planned.",
          },
          {
            title: "Luggage help",
            text: "Your chauffeur helps with bags at the terminal and at your door.",
          },
          {
            title: "24x7 dispatch",
            text: "Our dispatch desk is reachable by phone and WhatsApp at any hour.",
          },
        ],
        steps: [
          {
            title: "Share your terminal",
            text: "Tell us the airport, station or bus stop, plus your pickup timing.",
          },
          {
            title: "Driver meets you",
            text: "Your chauffeur arrives with your car and takes over the drive.",
          },
          {
            title: "Pay after the drop",
            text: "Settle by cash or UPI once you reach your destination.",
          },
        ],
        notes: [
          "Per-hour pricing, with the live estimate shown after you sign in.",
          "Airport parking and tolls are paid by you.",
          "No advance payment is needed — settle directly with the driver after the trip.",
        ],
      }}
    />
  );
}
