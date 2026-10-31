"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getSession, setSession, Session } from "@/lib/session";
import { api, setAccessToken } from "@/lib/api";
import { CONTACT_ADDRESS, CONTACT_PHONE_DISPLAY, CONTACT_TEL, CONTACT_WHATSAPP } from "@/lib/contact";
import { PricingGateProvider, usePricingGate } from "@/components/PricingGate";

function PricingNavButton({
  className,
  children,
  onOpen,
}: {
  className: string;
  children: ReactNode;
  onOpen?: () => void;
}) {
  const { openGate } = usePricingGate();
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openGate({ intent: "pricing" });
      }}
      className={className}
    >
      {children}
    </button>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const [session, setS] = useState<Session | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setS(getSession());
    const onSessionChanged = () => setS(getSession());
    window.addEventListener("droovee:session-changed", onSessionChanged);
    return () => window.removeEventListener("droovee:session-changed", onSessionChanged);
  }, []);

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: {}, auth: false }).catch(() => {});
    setAccessToken(null);
    setSession(null);
    window.location.href = "/";
  }

  return (
    <PricingGateProvider>
      <div className={`flex min-h-screen flex-col bg-slate-50 selection:bg-accent selection:text-brand-ink ${isLandingPage ? "pb-24 md:pb-0" : "pb-0"}`}>
        {/* HEADER / NAVBAR — brand ink */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-ink">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">

            {/* Reversed logo: white wordmark + amber dot, no plate needed on ink */}
            <Link href="/" className="flex items-center py-1">
              <Image
                src="/logo-reverse.png"
                alt="Droovee Logo"
                width={150}
                height={30}
                className="h-6 sm:h-7 w-auto object-contain"
                priority
              />
            </Link>

            {/* Desktop Navigation Items */}
            <nav className="hidden items-center gap-3 md:flex lg:gap-5">
              <Link href="/how-it-works" className="text-xs font-semibold text-slate-300 transition hover:text-white">
                How It Works
              </Link>
              <PricingNavButton className="text-xs font-semibold text-slate-300 transition hover:text-white">
                Pricing
              </PricingNavButton>
              <Link href="/testimonials" className="text-xs font-semibold text-slate-300 transition hover:text-white">
                Testimonials
              </Link>
              <Link href="/track" className="text-xs font-semibold text-slate-300 transition hover:text-white">
                Track booking
              </Link>

              {session?.kind === "customer" ? (
                <>
                  <Link
                    href="/bookings"
                    className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-white/15"
                  >
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse"></span>
                    My Trips
                  </Link>
                  <Link
                    href="/book"
                    className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-bold text-brand-ink shadow-sm transition hover:bg-accent-hover"
                  >
                    Book Driver
                  </Link>
                  <button
                    onClick={signOut}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-rose-300"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-slate-300 transition hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-white/40 hover:text-white"
                  >
                    Register
                  </Link>
                  <Link
                    href="/book"
                    className="inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-1.5 text-xs font-extrabold text-brand-ink shadow-md shadow-accent/25 hover:bg-accent-hover transition hover:scale-105"
                  >
                    Hire a Driver
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Right Controls: Book + Hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href="/book"
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-brand-ink shadow-sm"
              >
                Book Driver
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
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
            <div className="border-b border-white/10 bg-brand-ink px-4 py-5 shadow-xl md:hidden">
              <div className="flex flex-col space-y-3.5 text-sm font-medium">
                <Link
                  href="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-300 hover:text-accent"
                >
                  How It Works
                </Link>
                <PricingNavButton
                  onOpen={() => setMobileMenuOpen(false)}
                  className="text-left text-slate-300 hover:text-accent"
                >
                  Fares &amp; Pricing
                </PricingNavButton>
                <Link
                  href="/testimonials"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-300 hover:text-accent"
                >
                  Customer Testimonials
                </Link>
                <Link
                  href="/track"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-300 hover:text-accent"
                >
                  Track Booking
                </Link>
                <Link
                  href="/packages"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-300 hover:text-accent"
                >
                  Outstation Packages
                </Link>

                <div className="border-t border-white/10 pt-3">
                  {session?.kind === "customer" ? (
                    <button
                      onClick={signOut}
                      className="w-full rounded-xl border border-white/15 py-2.5 text-center font-semibold text-rose-300"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center font-semibold text-slate-200 hover:bg-white/10"
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

        {/* Sticky Bottom Booking Bar on Mobile (only on landing page) */}
        {isLandingPage && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-ink p-3 md:hidden">
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <Link
                href="/book"
                className="flex-1 rounded-xl bg-accent py-3 text-center text-sm font-extrabold text-brand-ink shadow-lg hover:bg-accent-hover transition"
              >
                Book a Driver Now
              </Link>
              <a
                href={CONTACT_TEL}
                aria-label="Call Droovee"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Floating WhatsApp Widget on Desktop */}
        <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col gap-2.5">
          <a
            href={CONTACT_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp Droovee"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 hover:brightness-105"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.6.8-.4 1.1.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.6 1.3z" />
            </svg>
          </a>
        </div>

        {/* FOOTER */}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 md:grid-cols-4 sm:px-6 lg:px-10">
            <div>
              <div className="flex items-center">
                <Image
                  src="/logo.png"
                  alt="Droovee Logo"
                  width={120}
                  height={34}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Bhubaneswar’s trusted platform for hiring professional, police-verified drivers for your personal vehicle.
              </p>
              <p className="mt-3 text-xs text-slate-400">{CONTACT_ADDRESS}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand-link ring-1 ring-brand-ink/20">
                  100% Verified
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  ★ 4.9/5 Rating
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">Trip Options</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li><Link href="/city" className="hover:text-brand-link transition">City Driver</Link></li>
                <li><Link href="/outstation" className="hover:text-brand-link transition">Outstation Driver</Link></li>
                <li><Link href="/airport-transfer" className="hover:text-brand-link transition">Airport Transfer</Link></li>
                <li><Link href="/monthly" className="hover:text-brand-link transition">Monthly Driver</Link></li>
                <li><Link href="/corporate" className="hover:text-brand-link transition">Corporate Drivers</Link></li>
                <li><Link href="/packages" className="hover:text-brand-link transition">Fixed-Price Packages</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">Support & Policies</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li><Link href="/how-it-works" className="hover:text-brand-link transition">How It Works</Link></li>
                <li><Link href="/testimonials" className="hover:text-brand-link transition">Customer Testimonials</Link></li>
                <li><Link href="/faq" className="hover:text-brand-link transition">FAQ & Help</Link></li>
                <li><Link href="/track" className="hover:text-brand-link transition">Track Active Booking</Link></li>
                <li><Link href="/terms" className="hover:text-brand-link transition">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-brand-link transition">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">Contact Us 24×7</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>
                  <span className="block text-slate-400">Call Dispatch:</span>
                  <a href={CONTACT_TEL} className="font-semibold text-brand-ink hover:text-brand-link">{CONTACT_PHONE_DISPLAY}</a>
                </li>
                <li>
                  <span className="block text-slate-400">WhatsApp Dispatch:</span>
                  <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="font-semibold text-brand-link hover:underline">Chat on WhatsApp</a>
                </li>
                <li>
                  <span className="block text-slate-400">Email:</span>
                  <a href="mailto:droovee.admin@gmail.com" className="font-medium text-slate-800 hover:text-brand-link">droovee.admin@gmail.com</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bhubaneswar Coverage Hubs */}
          <div className="border-t border-slate-100 bg-slate-50/50 py-6 px-6 lg:px-10">
            <div className="mx-auto max-w-7xl">
              <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                Bhubaneswar Driver Coverage Hubs
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-600">
                <span>📍 Patia</span>
                <span className="text-slate-300">•</span>
                <span>📍 Jayadev Vihar</span>
                <span className="text-slate-300">•</span>
                <span>📍 KIIT Square</span>
                <span className="text-slate-300">•</span>
                <span>📍 Nayapalli</span>
                <span className="text-slate-300">•</span>
                <span>📍 Master Canteen</span>
                <span className="text-slate-300">•</span>
                <span>📍 Biju Patnaik Airport</span>
                <span className="text-slate-300">•</span>
                <span>📍 Infocity</span>
                <span className="text-slate-300">•</span>
                <span>📍 Saheed Nagar</span>
                <span className="text-slate-300">•</span>
                <span>📍 Cuttack Highway</span>
                <span className="text-slate-300">•</span>
                <span>📍 Puri Jagannath Expressway</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-xs text-slate-400 lg:px-10">
              <p>© 2026 DROOVEE MOBILITY PVT. LTD. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </PricingGateProvider>
  );
}