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
        <div className="relative overflow-hidden rounded-3xl bg-brand-ink px-6 py-10 text-white shadow-xl md:px-12 md:py-14">
          <div className="relative grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">
                Transparent fares
              </span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Know your fare before you book</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-dark md:text-base">
                Pricing is private to signed-in customers. Sign in with your mobile number to see the full tariff and calculate an estimate.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openGate({ intent: "pricing" })}
                  className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-brand-ink shadow-lg shadow-accent/25 transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
                >
                  See full pricing →
                </button>
                <button
                  type="button"
                  onClick={() => openGate({ intent: "estimate" })}
                  className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
                >
                  Get an estimate
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">What you unlock</p>
              <ul className="mt-3 divide-y divide-white/10 text-sm text-slate-200">
                <li className="flex items-start gap-2 py-2.5 first:pt-0"><span className="mt-0.5 text-accent">✓</span> Live hourly, half-day and full-day rates</li>
                <li className="flex items-start gap-2 py-2.5"><span className="mt-0.5 text-accent">✓</span> Outstation, airport and monthly tariffs</li>
                <li className="flex items-start gap-2 py-2.5"><span className="mt-0.5 text-accent">✓</span> Fixed-price packages</li>
                <li className="flex items-start gap-2 py-2.5 last:pb-0"><span className="mt-0.5 text-accent">✓</span> Instant fare estimate</li>
              </ul>
              <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">No password needed. A one-time code is sent to your mobile.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
