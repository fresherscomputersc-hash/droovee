"use client";
import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { t, useLang } from "@/lib/i18n";

import { useEffect, useState } from "react";
import { getSession, Session } from "@/lib/session";

export function Hero() {
  const lang = useLang();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const isCustomer = session?.kind === "customer";

  return (
    <div className="flex flex-col items-start text-left">
      {/* Editorial headline tag */}
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
        <span>Bhubaneswar</span>
        <span className="text-emerald-600">•</span>
        <span>24×7 Professional Chauffeurs</span>
      </div>

      {/* Main Hero Headline matching udrivo typography */}
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
        Hire a Verified Driver in Bhubaneswar for Your Car
      </h1>

      {/* High-contrast subtitle */}
      <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
        Need an acting driver near you? Hire a professional, police-verified driver for your own car at transparent hourly rates. Experienced, punctual, and safe on every trip.
      </p>

      {/* Trust Badges matching udrivo pill format */}
      <div className="mt-6 flex flex-wrap gap-2.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 13.4-3.5-3.5 1.4-1.4 2.1 2.1 4.5-4.5 1.4 1.4-5.9 5.9z" />
          </svg>
          100% Police-Verified Drivers
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 13.4-3.5-3.5 1.4-1.4 2.1 2.1 4.5-4.5 1.4 1.4-5.9 5.9z" />
          </svg>
          Vehicle Damage Accountable
        </div>
      </div>

      {/* Customer Rating with 5 Gold Stars */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex text-amber-400">
          {"★★★★★"}
        </div>
        <span className="text-sm font-bold text-white">4.9/5</span>
        <span className="text-xs text-slate-400">from 1,000+ car owners</span>
      </div>

      {/* Action Buttons matching udrivo pill shape */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href="/book"
          className="rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 hover:scale-105"
        >
          Book a Driver Now →
        </Link>
        <Link
          href={isCustomer ? "/bookings" : "/track"}
          className="rounded-full border border-slate-700 bg-slate-800/90 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {isCustomer ? "My Trips" : "Track Driver"}
        </Link>
      </div>

      {!isCustomer && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>Already have an account?</span>
          <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
            Sign In
          </Link>
          <span>•</span>
          <Link href="/register" className="font-semibold text-slate-300 hover:text-white hover:underline">
            Register as Member
          </Link>
        </div>
      )}

      {/* Voucher card for LAUNCH99 */}
      <div className="mt-7 w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300">New User Benefit</span>
            <p className="text-slate-300">
              First hour at only <span className="font-bold text-white">₹99</span> with coupon
            </p>
          </div>
          <span className="rounded-lg border border-amber-400/40 bg-amber-400/20 px-2.5 py-1 font-mono font-bold text-amber-300 tracking-wider">
            LAUNCH99
          </span>
        </div>
      </div>
    </div>
  );
}