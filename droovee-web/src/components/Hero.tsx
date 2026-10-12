"use client";
import { LinkButton } from "@/components/ui";
import { t, useLang } from "@/lib/i18n";

/** Homepage hero with Odia/English toggle. */
export function Hero() {
  const lang = useLang();
  return (
    <div>
      <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Bhubaneswar · Open 24×7</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{t("hero", lang)}</h1>
      <p className="mt-4 text-lg text-slate-600">{t("herosub", lang)}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <LinkButton href="/book">{t("book", lang)}</LinkButton>
        <LinkButton href="/register" variant="secondary">{t("createaccount", lang)}</LinkButton>
      </div>
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Launch offer:</strong> first hour at <strong>₹99</strong> with coupon code{" "}
        <span className="rounded bg-white px-2 py-0.5 font-mono font-semibold ring-1 ring-amber-300">LAUNCH99</span>.
        It's pre-filled for you at checkout.
      </div>
    </div>
  );
}
