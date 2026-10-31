"use client";
import { useState } from "react";

export function RideOtpCard({ b }: { b: any }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!b || (!b.startOtp && !b.endOtp)) return null;

  const isTripInProgress = b.status === "in_progress";
  const isAssigned = ["driver_assigned", "driver_on_the_way", "driver_arrived"].includes(b.status);

  if (!isTripInProgress && !isAssigned) return null;

  const copy = (code: string, label: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-2xl border-2 border-brand-ink/20 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 p-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink">
            {isTripInProgress ? "Trip In Progress · Ride OTP Verification" : "Driver Assigned · Ride OTP Verification"}
          </h2>
        </div>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
          Security Verification
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {b.startOtp && (
          <div
            className={`rounded-xl border p-4 transition ${
              !isTripInProgress
                ? "border-amber-400 bg-white shadow-md ring-2 ring-amber-400/30"
                : "border-slate-200 bg-slate-50/70 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">START RIDE OTP</span>
              {!isTripInProgress && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  Share when driver arrives
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-mono text-3xl font-extrabold tracking-widest text-brand-ink">{b.startOtp}</p>
              <button
                type="button"
                onClick={() => copy(b.startOtp, "start")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-brand-ink active:scale-95"
              >
                {copied === "start" ? "✓ Copied" : "Copy OTP"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Share this 4-digit code with your driver when they reach your pickup location to begin the trip.
            </p>
          </div>
        )}

        {b.endOtp && (
          <div
            className={`rounded-xl border p-4 transition ${
              isTripInProgress
                ? "border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/30"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">END RIDE OTP</span>
              {isTripInProgress && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  Share to complete trip
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-mono text-3xl font-extrabold tracking-widest text-emerald-950">{b.endOtp}</p>
              <button
                type="button"
                onClick={() => copy(b.endOtp, "end")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-900 active:scale-95"
              >
                {copied === "end" ? "✓ Copied" : "Copy OTP"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Share this 4-digit code with your driver once you reach your destination to safely finish the ride.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
