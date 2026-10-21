import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Calculator } from "@/components/Calculator";
import { PriceList } from "@/components/PriceList";
import { Hero } from "@/components/Hero";
import { Reviews } from "@/components/Trust";

const STEPS = [
  {
    n: "01",
    t: "Book Online",
    d: "Tell us where, when, and for how long. Add your car model and preferred payment mode.",
  },
  {
    n: "02",
    t: "Instant Verification",
    d: "Our dispatch team verifies driver availability and reserves a verified driver immediately.",
  },
  {
    n: "03",
    t: "Driver at Doorstep",
    d: "A trained, uniformed driver arrives at your pickup location with ID verification.",
  },
  {
    n: "04",
    t: "Relax in Your Own Car",
    d: "Enjoy the ride. Track trip status, receive digital receipts, and pay after completion.",
  },
];

const FEATURES = [
  {
    icon: "🛡️",
    t: "Police-Verified Drivers",
    d: "No random gig drivers. Every driver is trained and verified with complete police background checks.",
  },
  {
    icon: "👔",
    t: "Uniformed & Trained",
    d: "Trained in smooth defensive driving, customer etiquette, route navigation, and luxury car handling.",
  },
  {
    icon: "🤝",
    t: "Accountability Guarantee",
    d: "Vehicle damage while our driver is driving is our direct operational responsibility. Full peace of mind.",
  },
  {
    icon: "⚡",
    t: "Zero Surge Pricing",
    d: "Transparent fixed hourly and outstation rates. No 2x rain or rush-hour surges, ever.",
  },
  {
    icon: "📍",
    t: "Live Public Tracking",
    d: "Share your live trip progress with your family with one click without needing an app login.",
  },
  {
    icon: "📞",
    t: "24×7 Human Operations",
    d: "Direct WhatsApp and phone assistance anytime in Bhubaneswar. Real local dispatchers, zero bots.",
  },
];

export default function Home() {
  return (
    <PublicShell>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 py-16 text-white md:py-24">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 -top-40 flex justify-center opacity-25">
          <div className="h-[500px] w-[800px] rounded-full bg-emerald-500 blur-[140px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2">
          {/* Left Column: Hero Content */}
          <div>
            
            <Hero />
          </div>

          {/* Right Column: Pricing & Quick Booking Widget */}
          <div
            id="pricing"
            className="rounded-3xl border border-slate-700/60 bg-white/95 p-7 text-slate-900 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Transparent Fare Rates
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Live fleet prices • Verified before booking
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                Code: LAUNCH99
              </span>
            </div>

            <div className="mt-4">
              <PriceList />
            </div>

            <div className="mt-5 space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 ring-1 ring-slate-200/70">
              <p className="flex items-start gap-1.5 font-medium text-slate-700">
                <span className="text-emerald-600">✓</span>
                Tolls, parking, and fuel are supplied by the customer.
              </p>
              <p className="flex items-start gap-1.5 font-medium text-slate-700">
                <span className="text-emerald-600">✓</span>
                Driver is responsible for vehicle safety during transit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            Simple 4-Step Process
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            How Droovee Works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
            Professional chauffeurs at your doorstep without complicated contracts or vehicle leasing.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-sm font-bold text-white shadow-sm shadow-emerald-500/30">
                {s.n}
              </div>
              <p className="mt-4 text-base font-bold text-slate-900">{s.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Fare Calculator Container */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <Calculator />
        </div>
      </section>

      {/* WHY DROOVEE (TRUST & VALUE) */}
      <section className="border-t border-slate-200/70 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Reliability First
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Why Car Owners Trust Droovee
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Our drivers are trained, uniformed, and accountable on every trip — punctual pickup and complete peace of mind.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map((c) => (
              <div
                key={c.t}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl ring-1 ring-slate-200/60">
                  {c.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                Customer Experiences
              </h3>
              <span className="text-sm font-semibold text-emerald-700">★ 4.9/5 in Bhubaneswar</span>
            </div>
            <div className="mt-6">
              <Reviews />
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CALL TO ACTION */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-8 py-12 text-white shadow-xl md:px-14 md:py-16">
            <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Instant & Scheduled Dispatch
                </span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Need a professional driver right now?
                </h2>
                <p className="mt-2 text-sm text-slate-300 md:text-base">
  Doorstep arrival in 30 minutes anywhere in Bhubaneswar. Daily commutes, shopping trips, airport transfers, or highway travel—our verified chauffeurs drive your personal vehicle with care.
</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/faq"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View FAQ
                </Link>
                <Link
                  href="/book"
                  className="rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
                >
                  Book Driver Now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}