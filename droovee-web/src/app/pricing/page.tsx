"use client";
import { useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

type ServiceTab = "in-city" | "outstation" | "monthly";

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<ServiceTab>("in-city");

  return (
    <PublicShell>
      {/* HEADER BANNER */}
      <section className="bg-slate-900 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <span className="inline-block rounded-md bg-emerald-500/10 px-3 py-1 text-xs font-bold tracking-widest text-emerald-400">
              TRANSPARENT TARIFF
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Honest, Predictable Pricing
            </h1>
            <p className="mt-3 text-base text-slate-300">
              Fixed rate slabs with zero surge pricing. You only pay for driver time — fuel and car are yours.
            </p>
          </div>

          {/* Value highlights */}
          <div className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-800 pt-6 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-800/40 p-3">
              <p className="text-xs text-slate-400">Launch Promo</p>
              <p className="text-base font-bold text-emerald-400">₹99 1st Hour</p>
            </div>
            <div className="rounded-xl bg-slate-800/40 p-3">
              <p className="text-xs text-slate-400">Surge Multiplier</p>
              <p className="text-base font-bold text-white">0x (Never)</p>
            </div>
            <div className="rounded-xl bg-slate-800/40 p-3">
              <p className="text-xs text-slate-400">Driver Status</p>
              <p className="text-base font-bold text-white">100% Salaried</p>
            </div>
            <div className="rounded-xl bg-slate-800/40 p-3">
              <p className="text-xs text-slate-400">Payment Modes</p>
              <p className="text-base font-bold text-white">Cash / UPI / Card</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING CONTENT SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        
        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap items-center justify-start gap-2 border-b border-slate-200 pb-6">
          <button
            onClick={() => setActiveTab("in-city")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition sm:text-sm ${
              activeTab === "in-city"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            In-City & Hourly Rides
          </button>
          <button
            onClick={() => setActiveTab("outstation")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition sm:text-sm ${
              activeTab === "outstation"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Puri, Konark & Outstation
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition sm:text-sm ${
              activeTab === "monthly"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Monthly Chauffeur
          </button>
        </div>

        {/* TAB 1: IN-CITY PRICING */}
        {activeTab === "in-city" && (
          <div className="mt-8 space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              
              {/* Card 1 */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Short Errand</span>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">1 to 2 Hours</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">₹149</span>
                    <span className="text-xs text-slate-500">/ base start</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Subsequent hours at ₹89/hr. Ideal for doctor visits or grocery shopping.</p>
                  <ul className="mt-5 space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Doorstep arrival in 30 mins</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> City traffic handling</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> 15-min grace checkout</li>
                  </ul>
                </div>
                <Link href="/book" className="mt-6 block rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center text-xs font-bold text-slate-800 transition hover:bg-slate-100">
                  Book 1–2 Hours
                </Link>
              </div>

              {/* Card 2 - Most Popular */}
              <div className="relative flex flex-col justify-between rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-md">
                <div className="absolute -top-3 right-4 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Most Popular
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Half-Day</span>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">4 Hours Slab</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">₹399</span>
                    <span className="text-xs text-slate-500">/ package</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Extra hours at ₹89/hr. Perfect for shopping sprees, family dinners, or meetings.</p>
                  <ul className="mt-5 space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Unlimited stops within city</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Code LAUNCH99 applies</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Uniformed chauffeur</li>
                  </ul>
                </div>
                <Link href="/book" className="mt-6 block rounded-xl bg-emerald-600 py-2.5 text-center text-xs font-bold text-white transition hover:bg-emerald-500">
                  Book 4 Hours
                </Link>
              </div>

              {/* Card 3 */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Full-Day</span>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">8 Hours Slab</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">₹699</span>
                    <span className="text-xs text-slate-500">/ package</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Full day chauffeur dedicated to your car. Extra hours at ₹89/hr.</p>
                  <ul className="mt-5 space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Multi-location itinerary</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Dedicated driver all day</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Zero cancellation fee (2h notice)</li>
                  </ul>
                </div>
                <Link href="/book" className="mt-6 block rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center text-xs font-bold text-slate-800 transition hover:bg-slate-100">
                  Book 8 Hours
                </Link>
              </div>

             

            </div>
          </div>
        )}

        {/* TAB 2: OUTSTATION PRICING */}
        {activeTab === "outstation" && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">One-Way Highway</span>
              <h3 className="mt-2 text-xl font-bold text-slate-900">Bhubaneswar to Cuttack</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">₹449</span>
                <span className="text-xs text-slate-500">/ drop only</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Driver return fare is included in quote. Customer only provides tolls & fuel.</p>
              <Link href="/book" className="mt-6 block rounded-xl bg-emerald-600 py-2.5 text-center text-xs font-bold text-white">
                Book Drop
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Popular Day Trip</span>
              <h3 className="mt-2 text-xl font-bold text-slate-900">Puri / Konark Round-Trip</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">₹999</span>
                <span className="text-xs text-slate-500">/ up to 10 hours</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Temple visits, beach side, and return same day. Highway defensive drivers.</p>
              <Link href="/book" className="mt-6 block rounded-xl bg-emerald-600 py-2.5 text-center text-xs font-bold text-white">
                Book Puri Trip
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Multi-Day</span>
              <h3 className="mt-2 text-xl font-bold text-slate-900">All-Odisha Outstation</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">₹1,199</span>
                <span className="text-xs text-slate-500">/ calendar day</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Sambalpur, Berhampur, Angul, or Rourkela. Night halt allowance is ₹399/night.</p>
              <Link href="/book" className="mt-6 block rounded-xl bg-slate-900 py-2.5 text-center text-xs font-bold text-white">
                Book Multi-Day
              </Link>
            </div>
          </div>
        )}

        {/* TAB 3: MONTHLY CHAUFFEUR */}
        {activeTab === "monthly" && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Corporate & Personal</span>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Dedicated Monthly Chauffeurs</h3>
              <p className="mt-2 text-sm text-slate-600">
                Need a daily driver for office commutes, school drops, or executive handling in Bhubaneswar? We provide trained, uniformed drivers with complete replacement guarantees if your driver is on leave.
              </p>
            </div>
            
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <h4 className="font-bold text-slate-900">Standard 8-Hour Shift (26 Days)</h4>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">₹16,000 <span className="text-xs font-normal text-slate-500">/ month</span></p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <li>• Background and police-verified candidate</li>
                  <li>• Immediate standby driver during leaves</li>
                  <li>• GST invoice available for business deduction</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <h4 className="font-bold text-slate-900">Executive 10-Hour Shift (26 Days)</h4>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">₹19,500 <span className="text-xs font-normal text-slate-500">/ month</span></p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <li>• Fluent English / Hindi / Odia speakers</li>
                  <li>• Experienced with luxury sedans and premium SUVs</li>
                  <li>• Weekly vehicle grooming check included</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              <p className="text-xs text-slate-500">Custom timing shifts (12 hrs or 24x7 rotation) available on request.</p>
              <a href="https://wa.me/918114994367" target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800">
                Speak with Fleet Manager →
              </a>
            </div>
          </div>
        )}

        {/* UDRIVO-STYLE TRANSPARENCY & ALLOWANCE TABLE */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900">Tariff Policy & Additional Charges</h3>
            <p className="text-xs text-slate-500">Clear responsibility breakdown — zero surprise bills at trip conclusion.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-white font-semibold text-slate-700">
                <tr>
                  <th className="px-6 py-3.5">Particulars</th>
                  <th className="px-6 py-3.5">Rate / Rule</th>
                  <th className="px-6 py-3.5">Who Pays?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="px-6 py-3.5 font-medium text-slate-900">Fuel & Toll Charges</td>
                  <td className="px-6 py-3.5">Actuals based on journey</td>
                  <td className="px-6 py-3.5 text-slate-900 font-semibold">Customer directly</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-medium text-slate-900">Parking Fees</td>
                  <td className="px-6 py-3.5">As per airport/mall/market receipts</td>
                  <td className="px-6 py-3.5 text-slate-900 font-semibold">Customer directly</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-medium text-slate-900">Night Driving Charge</td>
                  <td className="px-6 py-3.5">₹150 flat (if ride touches 10:00 PM – 6:00 AM)</td>
                  <td className="px-6 py-3.5">Added to final bill</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-medium text-slate-900">Outstation Night Halt</td>
                  <td className="px-6 py-3.5">₹399 per night (driver food & lodging allowance)</td>
                  <td className="px-6 py-3.5">Added if not provided</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-medium text-slate-900">Overtime Grace Period</td>
                  <td className="px-6 py-3.5">First 15 minutes complimentary; post that calculated per 30 mins</td>
                  <td className="px-6 py-3.5">Pro-rata rate</td>
                </tr>
                <tr className="bg-emerald-50/50">
                  <td className="px-6 py-3.5 font-bold text-slate-900">Vehicle Transit Safety</td>
                  <td className="px-6 py-3.5 text-emerald-800 font-medium">Any fault/damage by driver while driving is company accountable</td>
                  <td className="px-6 py-3.5 font-bold text-emerald-700">Droovee Protected</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM BOOKING CTA */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white sm:flex-row">
          <div>
            <h4 className="text-xl font-extrabold">Ready to book your driver?</h4>
            <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
              Use code <span className="font-mono font-bold text-white underline">LAUNCH99</span> to get your first hour at just ₹99.
            </p>
          </div>
          <Link
            href="/book"
            className="rounded-xl bg-slate-950 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-slate-900 sm:text-sm"
          >
            Start Instant Booking →
          </Link>
        </div>

      </section>
    </PublicShell>
  );
}