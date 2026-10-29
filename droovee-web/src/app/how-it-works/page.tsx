"use client";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

const STEPS = [
  {
    step: "01",
    title: "Select Trip & Schedule",
    desc: "Sign in or create a free account, then choose In-City, Outstation, or Airport Transfer. Enter your pickup address, scheduled date/time, and car model (Sedan, SUV, EV, Manual/Automatic).",
    tip: "Tip: Sign in to see live fares and any active offers.",
    badge: "Step 1: Online Booking",
  },
  {
    step: "02",
    title: "Driver Assignment & Profile Card",
    desc: "Our Bhubaneswar dispatch desk reviews available verified drivers and locks in a driver. You receive a digital Driver Card with their photo, police-verification ID, driving experience, and phone number.",
    tip: "Live updates sent via SMS & WhatsApp.",
    badge: "Step 2: Instant Dispatch",
  },
  {
    step: "03",
    title: "Doorstep Arrival & Quick Walkaround",
    desc: "Your uniformed driver arrives at your pickup location 10 minutes early. Together, you do a 60-second walkaround of the vehicle to check fuel levels and existing exterior condition for mutual safety.",
    tip: "Mutual vehicle condition check protects both parties.",
    badge: "Step 3: Verification",
  },
  {
    step: "04",
    title: "Share 4-Digit Start OTP",
    desc: "Your tracking screen displays a secret 4-digit Start Code. Share this with the driver once you are ready. The driver inputs it on their portal, which officially starts the trip and activates liability coverage.",
    tip: "Trip never starts without your secret code.",
    badge: "Step 4: Secure Start",
  },
  {
    step: "05",
    title: "Sit Back in Your Own Car",
    desc: "Relax in your personal vehicle while our driver navigates traffic, parking, and toll booths. You can share your real-time tracking link with family with one tap—they can track your ride without downloading any app.",
    tip: "Customer supplies fuel; driver handles the wheel.",
    badge: "Step 5: The Journey",
  },
  {
    step: "06",
    title: "Share End OTP & Digital Settlement",
    desc: "At your final destination, provide the 4-digit End Code to close the trip. Your final transparent invoice appears on screen. Settle easily via UPI, GooglePay, Card, or Cash, and receive a GST receipt.",
    tip: "Exact pro-rata calculation. Zero surprise bills.",
    badge: "Step 6: Completion",
  },
];

const FAQS = [
  {
    q: "Who is responsible if damage happens to my car?",
    a: "Every Droovee chauffeur is a full-time trained professional with verified driving credentials. If any accident or damage occurs due to our driver's fault while driving, Droovee takes direct operational accountability. You are never left to argue with random gig drivers.",
  },
  {
    q: "Do I need to download an app to use Droovee?",
    a: "No app download is needed. Droovee is completely web-first: create a free account, book, track your driver live, and get digital receipts from your phone's browser. You also get status links via WhatsApp and SMS.",
  },
  {
    q: "Who pays for fuel, highway tolls, and parking?",
    a: "Since the driver is operating your vehicle, fuel is already in your car. Toll booth FASTag charges and physical parking tickets are paid directly by the customer.",
  },
  {
    q: "How does the driver return on one-way drops?",
    a: "For one-way drops (like Bhubaneswar to Cuttack or Airport drops), the driver handles their own return travel via public transit/bus, and the return allowance is already calculated transparently into the fixed quote.",
  },
];

export default function HowItWorksPage() {
  return (
    <PublicShell>
      {/* HEADER SECTION */}
      <section className="bg-brand-ink py-12 text-white sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-bold tracking-widest text-slate-300">
              STEP-BY-STEP PROCESS
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              How Droovee Works
            </h1>
            <p className="mt-3 text-base text-slate-300">
              From doorstep arrival to final drop-off: here is how we ensure 100% safety, vehicle security, and zero hassles on every booking.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="rounded-xl bg-accent px-6 py-3 text-xs font-bold text-brand-ink transition hover:bg-accent-hover sm:text-sm"
            >
              Book a Chauffeur Now →
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-xs font-semibold text-white transition hover:bg-white/10 sm:text-sm"
            >
              View Fare Breakdown
            </Link>
          </div>
        </div>
      </section>

      {/* TIMELINE STEPS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-link">The 6-Step Journey</span>
          <h2 className="mt-2 text-2xl font-black text-brand-ink sm:text-3xl">
            Simple, Transparent, and Secure
          </h2>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ink font-mono text-sm font-bold text-accent shadow-sm">
                    {s.step}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {s.badge}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-brand-ink">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{s.desc}</p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-medium text-brand-link">{s.tip}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 4-DIGIT CODE EXPLAINER BANNER */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-white/10 bg-brand-ink p-8 text-white sm:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-300">
                Anti-Fraud & Security System
              </span>
              <h3 className="mt-3 text-2xl font-black sm:text-3xl">
                The 4-Digit Trip Verification Protocol
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
                To guarantee you are only billed for actual driving time and to prevent unverified starts:
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-accent">1.</span>
                  <span><strong>Start Code:</strong> You receive an instant 4-digit code. Driver enters it to start the journey and log vehicle odometer.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-accent">2.</span>
                  <span><strong>End Code:</strong> Only you have the completion code. The billing timer stops the second you share this code.</span>
                </li>
              </ul>
            </div>

            {/* Visual Simulated Mockup */}
            <div className="rounded-2xl border border-white/15 bg-brand-deep/80 p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">Active Ride Verification</span>
                </div>
                <span className="font-mono text-xs text-slate-400">#DRV-9082</span>
              </div>
              
              <div className="mt-5 text-center">
                <p className="text-xs text-slate-400">Share this code with your driver at pickup:</p>
                <div className="mx-auto mt-3 flex justify-center gap-2 font-mono">
                  <span className="flex h-12 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xl font-black text-accent">8</span>
                  <span className="flex h-12 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xl font-black text-accent">2</span>
                  <span className="flex h-12 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xl font-black text-accent">9</span>
                  <span className="flex h-12 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xl font-black text-accent">1</span>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">Starts vehicle safety cover and time meter.</p>
              </div>
            </div>
          </div>
        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div className="mt-20">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-link">Got Questions?</span>
            <h2 className="mt-2 text-2xl font-black text-brand-ink sm:text-3xl">Frequently Asked Questions</h2>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h4 className="text-base font-bold text-brand-ink">{f.q}</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM PROMPT */}
        <div className="mt-16 text-center">
          <p className="text-sm font-medium text-slate-600">Still have a specific question about your trip?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/918114994367"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Chat on WhatsApp (+91 81149 94367)
            </a>
            <Link
              href="/book"
              className="rounded-xl bg-accent px-6 py-2.5 text-xs font-bold text-brand-ink shadow-sm transition hover:bg-accent-hover"
            >
              Start Instant Booking →
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}