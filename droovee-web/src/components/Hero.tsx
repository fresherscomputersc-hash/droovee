"use client";

import Link from "next/link";
import { usePricingGate } from "@/components/PricingGate";

/**
 * Landing hero: dark emerald gradient with a slow CSS-only aurora, staggered
 * entrance, and no public pricing. Pricing is opened through the sign-in gate.
 */
export function Hero() {
  const { openGate } = usePricingGate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 py-20 text-white md:py-28">
      <style>{`
        @keyframes hero-aurora-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .55; }
          50% { transform: translate3d(36px, -28px, 0) scale(1.16); opacity: .8; }
        }
        @keyframes hero-aurora-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .4; }
          50% { transform: translate3d(-30px, 22px, 0) scale(1.12); opacity: .65; }
        }
        @keyframes hero-aurora-c {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .35; }
          50% { transform: translate3d(24px, 18px, 0) scale(1.1); opacity: .55; }
        }
        @keyframes hero-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-aurora-a { animation: hero-aurora-a 16s ease-in-out infinite; }
        .hero-aurora-b { animation: hero-aurora-b 20s ease-in-out infinite; }
        .hero-aurora-c { animation: hero-aurora-c 24s ease-in-out infinite; }
        .hero-rise { opacity: 0; animation: hero-rise .45s cubic-bezier(.22, 1, .36, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .hero-aurora-a, .hero-aurora-b, .hero-aurora-c, .hero-rise {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="hero-aurora-a absolute -left-28 top-[-18%] h-[540px] w-[540px] rounded-full bg-emerald-500/25 blur-[120px]" />
        <div className="hero-aurora-b absolute right-[-12%] top-[8%] h-[440px] w-[440px] rounded-full bg-teal-400/20 blur-[110px]" />
        <div className="hero-aurora-c absolute bottom-[-32%] left-1/3 h-[480px] w-[480px] rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <div className="hero-rise inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <span>Bhubaneswar</span>
          <span className="text-emerald-600">•</span>
          <span>Professional Chauffeurs</span>
        </div>

        <h1
          className="hero-rise mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "70ms" }}
        >
          Your Car, Our <span className="text-emerald-400">Professional Driver</span>
        </h1>

        <p
          className="hero-rise mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
          style={{ animationDelay: "140ms" }}
        >
          Book experienced drivers for your own car. Safe, reliable, and convenient transportation whenever you need it.
        </p>

        <div
          className="hero-rise mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "210ms" }}
        >
          <Link
            href="/book"
            className="rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:scale-105 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Book Your Driver Now →
          </Link>
          <button
            type="button"
            onClick={() => openGate({ intent: "pricing" })}
            className="rounded-full border border-slate-700 bg-slate-800/90 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            See Pricing
          </button>
        </div>

        <div
          className="hero-rise mx-auto mt-12 grid max-w-2xl grid-cols-1 divide-y divide-white/10 border-t border-white/10 pt-8 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          style={{ animationDelay: "280ms" }}
        >
          <div className="px-4 py-4 sm:py-0">
            <p className="text-3xl font-extrabold text-white">500+</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Verified Drivers</p>
          </div>
          <div className="px-4 py-4 sm:py-0">
            <p className="text-3xl font-extrabold text-white">10k+</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Happy Customers</p>
          </div>
          <div className="px-4 py-4 sm:py-0">
            <p className="text-3xl font-extrabold text-white">4.9/5</p>
            <p className="mt-1 text-xs font-medium text-slate-400">from 1,000+ trips</p>
          </div>
        </div>
      </div>
    </section>
  );
}
