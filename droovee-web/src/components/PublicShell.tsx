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
    <div className="flex min-h-screen flex-col bg-slate-50 selection:bg-emerald-500 selection:text-white">
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-10">
          
          {/* Brand Logo - Anchored cleanly on the left */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 font-bold text-white shadow-sm shadow-emerald-600/30 transition group-hover:scale-105">
              D
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Droovee<span className="text-emerald-600">.</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/#services" className="text-slate-600 transition hover:text-slate-950">
              {t("services", lang)}
            </Link>
            <Link href="/#pricing" className="text-slate-600 transition hover:text-slate-950">
              {t("pricing", lang)}
            </Link>
            
            {/* Language Pill */}
            <button
              onClick={toggleLang}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300"
              aria-label="Switch language"
            >
              {lang === "en" ? "ଓଡ଼ିଆ" : "English"}
            </button>

            {session?.kind === "customer" ? (
              <>
                <Link href="/bookings" className="text-slate-600 transition hover:text-slate-950">
                  {t("mybookings", lang)}
                </Link>
                <Link href="/track" className="text-slate-600 transition hover:text-slate-950">
                  {t("track", lang)}
                </Link>
                <Link
                  href="/book/user"
                  className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  {t("book", lang)}
                </Link>
                <button onClick={signOut} className="text-slate-500 transition hover:text-rose-600">
                  {t("signout", lang)}
                </button>
              </>
            ) : (
              <>
                <Link href="/track" className="text-slate-600 transition hover:text-slate-950">
                  {t("track", lang)}
                </Link>
                <Link
                  href="/book"
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 hover:shadow"
                >
                  {t("book", lang)}
                </Link>
                <Link href="/login" className="text-slate-600 transition hover:text-slate-950">
                  {t("signin", lang)}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">{children}</main>

      {/* Floating Call & WhatsApp Widgets */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2.5">
        <a
          href={CONTACT_TEL}
          aria-label="Call Droovee"
          className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800"
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
          className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:brightness-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.6.8-.4 1.1.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.6 1.3z" />
          </svg>
        </a>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 text-sm sm:grid-cols-2 md:grid-cols-4 lg:px-10">
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs text-white">D</span>
              Droovee
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Professional, police-verified salaried drivers for your personal vehicle in Bhubaneswar.
            </p>
            <p className="mt-3 text-xs text-slate-400">{CONTACT_ADDRESS}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Quick Contact</p>
            <p className="mt-3"><a href={CONTACT_TEL} className="text-slate-600 hover:text-slate-900 hover:underline">{CONTACT_PHONE_DISPLAY}</a></p>
            <p className="mt-1.5"><a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-900 hover:underline">Chat on WhatsApp</a></p>
            <p className="mt-1.5"><Link href="/track" className="text-slate-600 hover:text-slate-900 hover:underline">Track Booking</Link></p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Services & Info</p>
            <p className="mt-3"><Link href="/about" className="text-slate-600 hover:text-slate-900 hover:underline">About Us</Link></p>
            <p className="mt-1.5"><Link href="/faq" className="text-slate-600 hover:text-slate-900 hover:underline">FAQ</Link></p>
            <p className="mt-1.5"><Link href="/book" className="text-slate-600 hover:text-slate-900 hover:underline">Fast Booking</Link></p>
            <p className="mt-1.5"><Link href="/packages" className="text-slate-600 hover:text-slate-900 hover:underline">Packages & Outstation</Link></p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Policies & Safety</p>
            <p className="mt-3"><Link href="/terms" className="text-slate-600 hover:text-slate-900 hover:underline">Terms of Service</Link></p>
            <p className="mt-1.5"><Link href="/privacy" className="text-slate-600 hover:text-slate-900 hover:underline">Privacy Policy</Link></p>
            <p className="mt-1.5"><Link href="/cancellation" className="text-slate-600 hover:text-slate-900 hover:underline">Cancellation & Refunds</Link></p>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-xs text-slate-400 lg:px-10">
            <p>© Droovee. Bhubaneswar, Odisha · 24×7 Operations</p>
            <p>Drivers for your own car</p>
          </div>
        </div>
      </footer>
    </div>
  );
}