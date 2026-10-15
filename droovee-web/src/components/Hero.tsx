"use client";
import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { t, useLang } from "@/lib/i18n";

export function Hero() {
  const lang = useLang();

  return (
    <div className="flex flex-col items-start text-left">
      {/* Refined editorial tag - No cheesy glowing AI dots */}
      <div className="inline-flex items-center gap-2 rounded-md border border-slate-700/60 bg-slate-800/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-300 backdrop-blur-sm">
        <span>Bhubaneswar</span>
        <span className="text-slate-500">•</span>
        <span className="text-emerald-400">24×7 Chauffeur Service</span>
      </div>

      {/* Main Headline */}
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
        {t("hero", lang)}
      </h1>

      {/* Subtitle with high-contrast readable color */}
      <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
        {t("herosub", lang)}
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center gap-3.5">
        <Link
          href="/book"
          className="rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 hover:shadow-emerald-500/30"
        >
          {t("book", lang)} →
        </Link>
        <Link
          href="/register"
          className="rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition hover:bg-slate-700 hover:text-white"
        >
          {t("createaccount", lang)}
        </Link>
      </div>

      {/* Sleek Ticket/Voucher Card for LAUNCH99 */}
      <div className="mt-8 w-full max-w-md rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 text-xs text-amber-200/90 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-amber-400">Launch Benefit</span>
            <p className="text-slate-300">
              First hour at only <span className="font-bold text-white">₹99</span> with coupon
            </p>
          </div>
          <span className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono font-bold text-amber-300 tracking-wider">
            LAUNCH99
          </span>
        </div>
      </div>
    </div>
  );
}