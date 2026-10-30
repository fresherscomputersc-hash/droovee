import type { Metadata } from "next";
import { ServicePage } from "@/components/ServicePage";

export const metadata: Metadata = {
  title: "City driver in Bhubaneswar — Droovee",
  description:
    "Book a professional driver for city errands across Bhubaneswar. Shopping, meetings, hospital visits and daily runs in your own car, by the hour.",
};

export default function CityPage() {
  return (
    <ServicePage
      content={{
        label: "City driver",
        href: "/city",
        eyebrow: "City & errands",
        title: "City driver in Bhubaneswar",
        intro:
          "Shopping, meetings, hospital visits and daily errands across the city. A trained driver for your own car, booked by the hour.",
        image: {
          src: "/services/city.jpg",
          alt: "Droovee chauffeur driving a customer through Bhubaneswar traffic",
        },
        bookHref: "/book?service=hourly",
        bookLabel: "Book a city driver",
        highlights: [
          {
            title: "Hourly and flexible",
            text: "Pay for the first hour, then per extra hour. Stop wherever your day takes you.",
          },
          {
            title: "Any car",
            text: "Sedan, SUV, EV, manual or automatic — we drive the car you already own.",
          },
          {
            title: "Local knowledge",
            text: "Drivers who know Patia, Saheed Nagar, Master Canteen and the ring road.",
          },
          {
            title: "Doorstep start",
            text: "Your chauffeur arrives at your pickup point, ready to drive.",
          },
        ],
        steps: [
          {
            title: "Choose your hours",
            text: "Pick a date, a start time and how long you need the driver.",
          },
          {
            title: "We assign a driver",
            text: "Our dispatch desk confirms a verified chauffeur and shares their details.",
          },
          {
            title: "Ride, then pay",
            text: "Settle by cash or UPI directly with the driver after the trip.",
          },
        ],
        notes: [
          "Fuel is already in your car; tolls and parking are paid by you.",
          "Late-night trips between 10 PM and 6 AM may carry an additional charge.",
          "No advance payment is needed — settle directly with the driver after the trip.",
        ],
      }}
    />
  );
}
