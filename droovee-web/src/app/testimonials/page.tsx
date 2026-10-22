"use client";
import { useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

type Review = {
  id: string;
  name: string;
  location: string;
  car: string;
  service: "In-City" | "Outstation" | "Sober Driver" | "Airport";
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
};

const TESTIMONIALS: Review[] = [
  {
    id: "1",
    name: "Soumya Ranjan Mohapatra",
    location: "Patia, Bhubaneswar",
    car: "Hyundai Creta (Automatic)",
    service: "Outstation",
    rating: 5,
    date: "12 Oct 2026",
    comment:
      "Booked an outstation driver for a family trip to Puri and Konark. The driver was 15 minutes early in uniform, drove with extreme care on the highway, and handled temple parking without any fuss. Zero hidden charges.",
    verified: true,
  },
  {
    id: "2",
    name: "Priyanka Das",
    location: "Saheed Nagar, Bhubaneswar",
    car: "Tata Nexon EV",
    service: "In-City",
    rating: 5,
    date: "09 Oct 2026",
    comment:
      "I had multiple back-to-back client meetings across Jaydev Vihar and Infocity. Having a professional chauffeur in my own car allowed me to prepare presentations in the backseat stress-free. Very polite driver.",
    verified: true,
  },
  {
    id: "3",
    name: "Subhashis Mishra",
    location: "Chandrasekharpur",
    car: "Mahindra XUV700",
    service: "In-City",
    rating: 5,
    date: "05 Oct 2026",
    comment:
      "Hired a driver for a family wedding event in Bhubaneswar to manage guest pickups and drop-offs throughout the day. Extremely punctual, professional, and well-dressed. Took great care of our vehicle.",
    verified: true,
  },
  {
    id: "4",
    name: "Dr. Alok Pattnaik",
    location: "Khandagiri",
    car: "Honda City",
    service: "Airport",
    rating: 5,
    date: "28 Sep 2026",
    comment:
      "Needed an early morning 4:30 AM airport drop at Biju Patnaik Airport, and for the driver to return my car back home safely to my wife. Perfect execution and real-time status updates.",
    verified: true,
  },
  {
    id: "5",
    name: "Rakesh Nayak",
    location: "Cuttack Link Road",
    car: "Maruti Brezza",
    service: "In-City",
    rating: 4,
    date: "20 Sep 2026",
    comment:
      "Much cheaper than hiring a cab when you already own a car. First hour was just ₹99 with LAUNCH99. Highly recommended for hospital and market trips.",
    verified: true,
  },
  {
    id: "6",
    name: "Tanmayee Jena",
    location: "KIIT Square",
    car: "Kia Seltos",
    service: "Outstation",
    rating: 5,
    date: "14 Sep 2026",
    comment:
      "Safe driving, especially through busy Ghat sections towards Sambalpur. It’s comforting to know all Droovee drivers are on regular salary and police verified.",
    verified: true,
  },
];

export default function TestimonialsPage() {
  const [filter, setFilter] = useState<string>("all");

  const filteredReviews =
    filter === "all" ? TESTIMONIALS : TESTIMONIALS.filter((r) => r.service === filter);

  return (
    <PublicShell>
      {/* Header Banner */}
      <section className="bg-slate-900 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <span className="inline-block rounded-md bg-emerald-500/10 px-3 py-1 text-xs font-bold tracking-widest text-emerald-400">
              VERIFIED REVIEWS
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              What car owners in Bhubaneswar say about Droovee
            </h1>
            <p className="mt-3 text-base text-slate-300">
              Real stories from daily commuters, families, and professionals who trust our professional chauffeurs with their personal vehicles.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-800 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-black text-emerald-400 sm:text-3xl">4.9 / 5</p>
              <p className="text-xs text-slate-400">Average Ride Rating</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">100%</p>
              <p className="text-xs text-slate-400">Police-Verified Drivers</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">2,400+</p>
              <p className="text-xs text-slate-400">Trips Completed</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">Zero</p>
              <p className="text-xs text-slate-400">Surge Pricing Instances</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs & Reviews Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 pb-8">
          {[
            { id: "all", label: "All Reviews" },
            { id: "In-City", label: "In-City Trips" },
            { id: "Outstation", label: "Puri & Outstation" },
            { id: "Sober Driver", label: "Late Night / Sober" },
            { id: "Airport", label: "Airport Transfers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm ${
                filter === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReviews.map((r) => (
            <div
              key={r.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div>
                {/* Rating & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {r.service}
                  </span>
                </div>

                {/* Review Text */}
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  "{r.comment}"
                </p>
              </div>

              {/* Author & Car Info */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{r.name}</p>
                  {r.verified && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      ✓ Verified Ride
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">
                  <span>{r.location}</span>
                  <span>•</span>
                  <span className="font-medium text-slate-600">{r.car}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Booking Prompt */}
        <div className="mt-16 rounded-3xl bg-slate-900 p-8 text-center text-white sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Experience the Droovee difference</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
            Book your verified driver in under 30 seconds. Your car, our professional chauffeur.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/book"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Book a Chauffeur Now →
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}