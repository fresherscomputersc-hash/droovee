"use client";

import { usePricingGate } from "@/components/PricingGate";

/**
 * Sits after the Trip options section. Pricing is private, so both actions
 * open the mobile + OTP gate for logged-out visitors.
 */
export function PricingCta() {
  const { openGate } = usePricingGate();

  return (
    <section id="pricing-cta" className="bg-slate-50 pb-16 pt-4">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] px-6 py-10 text-white shadow-xl md:px-12 md:py-14">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                Transparent fares
              </span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Know your fare before you book</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
                Pricing is private to signed-in customers. Sign in with your mobile number to see the full tariff and calculate an estimate.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openGate({ intent: "pricing" })}
                  className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  See full pricing →
                </button>
                <button
                  type="button"
                  onClick={() => openGate({ intent: "estimate" })}
                  className="rounded-full border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Get an estimate
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">What you unlock</p>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-200">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Live hourly, half-day and full-day rates</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Outstation, airport and monthly tariffs</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Fixed-price packages</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Instant fare estimate</li>
              </ul>
              <p className="mt-4 text-xs text-slate-400">No password needed. A one-time code is sent to your mobile.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
