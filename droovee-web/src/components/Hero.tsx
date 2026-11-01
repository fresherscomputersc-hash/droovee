"use client";

import Link from "next/link";
import { usePricingGate } from "@/components/PricingGate";

/**
 * Landing hero: flat brand-ink panel, amber primary action, staggered
 * entrance, and no public pricing. Pricing is opened through the sign-in gate.
 */
export function Hero() {
  const { openGate } = usePricingGate();

  return (
    <section className="relative overflow-hidden bg-brand-ink py-20 text-white md:py-28">
      <style>{`
        @keyframes hero-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-rise { opacity: 0; animation: hero-rise .45s cubic-bezier(.22, 1, .36, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .hero-rise {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <div className="hero-rise inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <span>Bhubaneswar</span>
          <span className="text-accent">•</span>
          <span>Professional Chauffeurs</span>
        </div>

        <h1
          className="hero-rise mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "70ms" }}
        >
          Your Car, Our <span className="text-on-dark">Professional Driver</span>
        </h1>

        <p
          className="hero-rise mx-auto mt-5 max-w-2xl text-base leading-relaxed text-on-dark sm:text-lg"
          style={{ animationDelay: "140ms" }}
        >
          Hire background-verified, professional drivers for your own car in Bhubaneswar. On-demand hourly city trips, outstation travel to Puri &amp; Cuttack, and 24&times;7 airport transfers.
        </p>

        <div
          className="hero-rise mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "210ms" }}
        >
          <Link
            href="/book"
            className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-brand-ink shadow-lg shadow-accent/25 transition hover:scale-105 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
          >
            Book Your Driver Now →
          </Link>
          <button
            type="button"
            onClick={() => openGate({ intent: "pricing" })}
            className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
          >
            See Pricing
          </button>
        </div>

        <div
          className="hero-rise mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-6 sm:mt-12 sm:pt-8"
          style={{ animationDelay: "280ms" }}
        >
          <div className="px-2 text-center sm:px-4">
            <p className="text-2xl font-extrabold text-white sm:text-3xl">50</p>
            <p className="mt-1 text-[11px] font-medium leading-tight text-slate-400 sm:text-xs">Verified Drivers</p>
          </div>
          <div className="px-2 text-center sm:px-4">
            <p className="text-2xl font-extrabold text-white sm:text-3xl">1K+</p>
            <p className="mt-1 text-[11px] font-medium leading-tight text-slate-400 sm:text-xs">Happy Customers</p>
          </div>
          <div className="px-2 text-center sm:px-4">
            <p className="text-2xl font-extrabold text-white sm:text-3xl">4.9/5</p>
            <p className="mt-1 text-[11px] font-medium leading-tight text-slate-400 sm:text-xs">from 1,000+ trips</p>
          </div>
        </div>
      </div>
    </section>
  );
}
