"use client";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getSession, setSession, Session } from "@/lib/session";
import { api, setAccessToken } from "@/lib/api";
import { CONTACT_ADDRESS, CONTACT_PHONE_DISPLAY, CONTACT_TEL, CONTACT_WHATSAPP } from "@/lib/contact";
import { t, toggleLang, useLang } from "@/lib/i18n";

export function PublicShell({ children }: { children: ReactNode }) {
  const [session, setS] = useState<Session | null>(null);
  const lang = useLang();
  useEffect(() => setS(getSession()), []);

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: {}, auth: false }).catch(() => {});
    setAccessToken(null);
    setSession(null);
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">D</span>
            Droovee
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/#services" className="text-slate-600 hover:text-slate-900">{t("services", lang)}</Link>
            <Link href="/#pricing" className="text-slate-600 hover:text-slate-900">{t("pricing", lang)}</Link>
            <button onClick={toggleLang} className="rounded-lg px-2 py-1 text-xs ring-1 ring-slate-300" aria-label="Switch language">
              {lang === "en" ? "ଓଡ଼ିଆ" : "EN"}
            </button>
            {session?.kind === "customer" ? (
              <>
                <Link href="/bookings" className="text-slate-600 hover:text-slate-900">{t("mybookings", lang)}</Link>
                <Link href="/track" className="text-slate-600 hover:text-slate-900">{t("track", lang)}</Link>
                <Link href="/book/user" className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">{t("book", lang)}</Link>
                <button onClick={signOut} className="text-slate-600 hover:text-slate-900">{t("signout", lang)}</button>
              </>
            ) : (
              <>
                <Link href="/track" className="text-slate-600 hover:text-slate-900">{t("track", lang)}</Link>
                <Link href="/book" className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">{t("book", lang)}</Link>
                <Link href="/login" className="text-slate-600 hover:text-slate-900">{t("signin", lang)}</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {/* Floating Call / WhatsApp on every page */}
      <div className="fixed bottom-20 right-4 z-20 flex flex-col gap-2 lg:bottom-6 lg:right-6">
        <a href={CONTACT_TEL} aria-label="Call Droovee" className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
        </a>
        <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp Droovee" className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg hover:brightness-95">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.6.8-.4 1.1.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.6 1.3z" /></svg>
        </a>
      </div>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm md:grid-cols-4">
          <div>
            <p className="font-semibold text-slate-900">Droovee</p>
            <p className="mt-2 text-slate-600">A professional driver for your own car.</p>
            <p className="mt-2 text-slate-600">{CONTACT_ADDRESS}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Contact</p>
            <p className="mt-2"><a href={CONTACT_TEL} className="text-slate-600 hover:underline">{CONTACT_PHONE_DISPLAY}</a></p>
            <p className="mt-1"><a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="text-slate-600 hover:underline">WhatsApp us</a></p>
            <p className="mt-1"><Link href="/track" className="text-slate-600 hover:underline">Track booking</Link></p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Company</p>
            <p className="mt-2"><Link href="/about" className="text-slate-600 hover:underline">About us</Link></p>
            <p className="mt-1"><Link href="/faq" className="text-slate-600 hover:underline">FAQ</Link></p>
            <p className="mt-1"><Link href="/book" className="text-slate-600 hover:underline">Fast booking</Link></p>
            <p className="mt-1"><Link href="/packages" className="text-slate-600 hover:underline">Packages</Link></p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Policies</p>
            <p className="mt-2"><Link href="/terms" className="text-slate-600 hover:underline">Terms of service</Link></p>
            <p className="mt-1"><Link href="/privacy" className="text-slate-600 hover:underline">Privacy policy</Link></p>
            <p className="mt-1"><Link href="/cancellation" className="text-slate-600 hover:underline">Cancellation & refunds</Link></p>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">© Droovee · Bhubaneswar, Odisha · Open 24×7</div>
        </div>
      </footer>
    </div>
  );
}
