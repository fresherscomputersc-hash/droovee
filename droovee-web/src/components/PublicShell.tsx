"use client";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getSession, setSession, Session } from "@/lib/session";
import { api, setAccessToken } from "@/lib/api";
import { CONTACT_ADDRESS, CONTACT_PHONE_DISPLAY, CONTACT_TEL, CONTACT_WHATSAPP } from "@/lib/contact";
import { t, toggleLang, useLang } from "@/lib/i18n";

export function PublicShell({ children }: { children: ReactNode }) {
  const [session, setS] = useState<Session | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lang = useLang();

  useEffect(() => {
    setS(getSession());
  }, []);

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: {}, auth: false }).catch(() => {});
    setAccessToken(null);
    setSession(null);
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50 selection:bg-emerald-500 selection:text-white">
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 font-bold text-white shadow-sm shadow-emerald-600/30">
              D
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Droovee<span className="text-emerald-600">.</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            <Link href="/#services" className="text-slate-600 transition hover:text-slate-950">
              {t("services", lang)}
            </Link>
            <Link href="/how-it-works" className="text-slate-600 transition hover:text-slate-950">
              How It Works
            </Link>
            <Link href="/pricing" className="text-slate-600 transition hover:text-slate-950">
              Pricing
            </Link>
            <Link href="/testimonials" className="text-slate-600 transition hover:text-slate-950">
              Testimonials
            </Link>
            <Link href="/track" className="text-slate-600 transition hover:text-slate-950">
              {t("track", lang)}
            </Link>
            
            <button
              onClick={toggleLang}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              aria-label="Switch language"
            >
              {lang === "en" ? "ଓଡ଼ିଆ" : "EN"}
            </button>

            {session?.kind === "customer" ? (
              <>
                <Link href="/bookings" className="text-slate-600 hover:text-slate-950">
                  {t("mybookings", lang)}
                </Link>
                <Link
                  href="/book/user"
                  className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  {t("book", lang)}
                </Link>
                <button onClick={signOut} className="text-slate-500 hover:text-rose-600">
                  {t("signout", lang)}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/book"
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500"
                >
                  {t("book", lang)}
                </Link>
                <Link href="/login" className="text-slate-600 hover:text-slate-950">
                  {t("signin", lang)}
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Right Controls: Fast Book + Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/book"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
            >
              Book Driver
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-5 shadow-lg md:hidden">
            <div className="flex flex-col space-y-3.5 text-sm font-medium">
              <Link
                href="/#services"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 hover:text-emerald-600"
              >
                Services
              </Link>
              <Link
                href="/how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 hover:text-emerald-600"
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 hover:text-emerald-600"
              >
                Fares & Pricing
              </Link>
              <Link
                href="/testimonials"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 hover:text-emerald-600"
              >
                Customer Testimonials
              </Link>
              <Link
                href="/track"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 hover:text-emerald-600"
              >
                Track Booking
              </Link>
              <Link
                href="/packages"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 hover:text-emerald-600"
              >
                Outstation Packages
              </Link>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Language:</span>
                <button
                  onClick={toggleLang}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800"
                >
                  {lang === "en" ? "ଓଡ଼ିଆରେ ପଢ଼ନ୍ତୁ" : "Switch to English"}
                </button>
              </div>

              <div className="pt-2">
                {session?.kind === "customer" ? (
                  <button
                    onClick={signOut}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-center font-semibold text-rose-600"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full rounded-xl border border-slate-200 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Sign In to Account
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* BODY */}
      <main className="flex-1">{children}</main>

      {/* Floating Call & WhatsApp */}
      <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        <a
          href={CONTACT_TEL}
          aria-label="Call Droovee"
          className="grid h-11 w-11 place-items-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 sm:h-12 sm:w-12"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </a>
        <a
          href={CONTACT_WHATSAPP}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp Droovee"
          className="grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 sm:h-12 sm:w-12"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.6.8-.4 1.1.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.6 1.3z" />
          </svg>
        </a>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 md:grid-cols-4 sm:px-6 lg:px-10">
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs text-white">D</span>
              Droovee
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Police-verified salaried drivers who drive your own car in Bhubaneswar & Cuttack.
            </p>
            <p className="mt-3 text-xs text-slate-400">{CONTACT_ADDRESS}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Quick Contact</p>
            <p className="mt-3"><a href={CONTACT_TEL} className="text-slate-600 hover:underline">{CONTACT_PHONE_DISPLAY}</a></p>
            <p className="mt-1.5"><a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="text-slate-600 hover:underline">WhatsApp Us</a></p>
            <p className="mt-1.5"><Link href="/track" className="text-slate-600 hover:underline">Track Booking</Link></p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Company & How-To</p>
            <p className="mt-3"><Link href="/how-it-works" className="text-slate-600 hover:underline">How It Works</Link></p>
            <p className="mt-1.5"><Link href="/pricing" className="text-slate-600 hover:underline">Fare Breakdown</Link></p>
            <p className="mt-1.5"><Link href="/testimonials" className="text-slate-600 hover:underline">Customer Stories</Link></p>
            <p className="mt-1.5"><Link href="/faq" className="text-slate-600 hover:underline">FAQ</Link></p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Legal & Safety</p>
            <p className="mt-3"><Link href="/terms" className="text-slate-600 hover:underline">Terms of Service</Link></p>
            <p className="mt-1.5"><Link href="/privacy" className="text-slate-600 hover:underline">Privacy Policy</Link></p>
            <p className="mt-1.5"><Link href="/cancellation" className="text-slate-600 hover:underline">Cancellation & Refunds</Link></p>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-10">
            <p>© Droovee. Bhubaneswar, Odisha · 24×7 Operations</p>
            <p>Customer fuels & owns the car · Driver handles the wheel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}