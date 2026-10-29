import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Hero } from "@/components/Hero";
import { PricingCta } from "@/components/PricingCta";
import { CONTACT_PHONE_DISPLAY, CONTACT_TEL, CONTACT_WHATSAPP } from "@/lib/contact";

const TRUST = [
  {
    title: "Police-verified drivers",
    text: "Background-checked, trained and uniformed chauffeurs for your own car.",
    icon: (
      <>
        <path d="M4.75 12.9 9.6 17.6 19.25 7.1" strokeWidth={2.4} />
      </>
    ),
  },
  {
    title: "Damage accountability",
    text: "If your car is damaged while our driver is driving, it is our direct responsibility.",
    icon: (
      <>
        <path d="M4.75 15.75V12.6l1.72-4.24A1.6 1.6 0 0 1 7.95 7.4h8.1a1.6 1.6 0 0 1 1.48.96l1.72 4.24v3.15" />
        <path d="M4.75 12.6h14.5" />
        <circle cx="7.6" cy="16.9" r="1.4" />
        <circle cx="16.4" cy="16.9" r="1.4" />
      </>
    ),
  },
  {
    title: "No surge pricing",
    text: "Clear hourly and outstation rates. No rain, rush-hour or holiday markups.",
    icon: (
      <>
        <circle cx="8.2" cy="8.2" r="2.4" />
        <circle cx="15.8" cy="15.8" r="2.4" />
        <path d="M18.4 5.6 5.6 18.4" />
      </>
    ),
  },
  {
    title: "Live trip management",
    text: "Track your driver from pickup to drop, with live status and ETA updates.",
    icon: (
      <>
        <path d="M12 20.75s6.25-5.2 6.25-10.15a6.25 6.25 0 1 0-12.5 0C5.75 15.55 12 20.75 12 20.75Z" />
        <circle cx="12" cy="10.4" r="2.2" />
      </>
    ),
  },
];

const SERVICES = [
  {
    title: "Hourly & city",
    desc: "Shopping, meetings, hospital visits and daily errands across Bhubaneswar.",
    href: "/services/hourly",
  },
  {
    title: "Outstation",
    desc: "One-way or round-trip drivers to Puri, Cuttack, Konark and beyond.",
    href: "/services/outstation_one_way",
  },
  {
    title: "Airport & station",
    desc: "Punctual pickup and drop at Biju Patnaik Airport, railway and bus stations.",
    href: "/services/airport_pickup_drop",
  },
  {
    title: "Monthly & corporate",
    desc: "Dedicated daily commute drivers for offices, hospitals and institutions.",
    href: "/packages",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Sign in & choose your trip",
    text: "Create a free account or sign in, then tell us your car, pickup and schedule.",
  },
  {
    n: "02",
    title: "We assign a verified driver",
    text: "Our dispatch team confirms availability and shares your driver details.",
  },
  {
    n: "03",
    title: "Ride, then pay after",
    text: "Relax in your own car. Pay by cash or UPI after the trip.",
  },
];

const REVIEWS = [
  {
    name: "Alok Pattnaik",
    role: "Patia, Bhubaneswar",
    service: "Outstation (Puri & Konark)",
    text: "Booked a driver for our family trip to Puri and Konark. Ramesh was punctual, courteous, and drove very smoothly. Complete peace of mind for my Creta.",
  },
  {
    name: "Priyadarshini Mishra",
    role: "Nayapalli, Bhubaneswar",
    service: "Half-day city driver",
    text: "Had multiple meetings across IRC Village, Secretariat and Khandagiri. The driver handled peak traffic and parking smoothly.",
  },
  {
    name: "Dr. B. K. Mohanty",
    role: "Saheed Nagar",
    service: "Daily medical transit",
    text: "I use Droovee for regular hospital and clinic transit. Knowing that vehicle safety while driving is their direct responsibility makes all the difference.",
  },
];

const FAQS = [
  {
    q: "Do I need an account to book?",
    a: "Yes. Sign in or create a free account in under a minute. This keeps your trips, invoices and support history in one place.",
  },
  {
    q: "Are all Droovee drivers police-verified?",
    a: "Yes. Every driver undergoes Aadhaar and driving-licence checks plus local police verification before being assigned.",
  },
  {
    q: "What happens if my car is damaged while the driver is driving?",
    a: "Vehicle damage while our driver is driving is our direct operational responsibility. Tell our dispatch team immediately so we can record and resolve it.",
  },
  {
    q: "Who covers fuel, tolls and parking?",
    a: "Fuel, tolls and parking are paid by you. For outstation trips, you also provide or reimburse the driver's food and overnight stay.",
  },
  {
    q: "When do I pay?",
    a: "No advance payment is needed. Pay by cash or UPI directly to the driver after completing the trip.",
  },
  {
    q: "How do I track my booking?",
    a: "Open Track booking and enter your booking ID or mobile number. You can also see every trip in My Trips after signing in.",
  },
];

export default function Home() {
  return (
    <PublicShell>
      {/* HERO */}
      <Hero />

      {/* TRUST STRIP */}
      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div
              key={t.title}
              className="droovee-card-shadow flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  {t.icon}
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-brand-ink">{t.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRIP OPTIONS */}
      <section id="services" className="bg-brand-soft py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Trip options
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl">One driver. Your car. Your plan.</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Hourly city trips, outstation drives, airport transfers and monthly commutes — all with verified chauffeurs.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="droovee-card-shadow group flex flex-col justify-between rounded-2xl border border-slate-200/80 border-t-2 border-t-accent bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:border-t-accent"
              >
                <div>
                  <h3 className="text-lg font-bold text-brand-ink transition group-hover:text-brand-link">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-brand-link">
                  <span>Explore</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/packages" className="text-sm font-semibold text-brand-link hover:underline">
              See all services and fixed-price packages →
            </Link>
          </div>
        </div>
      </section>

      {/* FULL PRICING / ESTIMATE CTA (private pricing) */}
      <PricingCta />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Simple by design
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl">Book in three steps</h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-ink text-sm font-bold text-accent">{s.n}</span>
                <h3 className="mt-4 text-base font-bold text-brand-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/book" className="inline-flex rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-brand-ink shadow-lg shadow-accent/25 transition hover:bg-accent-hover">
              Book Now →
            </Link>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="bg-brand-ink py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">
              Verified stories
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Happy car owners in Bhubaneswar</h2>
            <p className="mt-3 text-base text-slate-300">Real trips, real drivers, real peace of mind.</p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {REVIEWS.map((r) => (
              <div key={r.name} className="flex flex-col justify-between rounded-2xl bg-white p-6 text-brand-ink shadow-xl">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-ink">
                        {r.name.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-brand-ink">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.role}</p>
                      </div>
                    </div>
                    <span className="text-sm text-accent">★★★★★</span>
                  </div>
                  <p className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">{r.service}</p>
                  <p className="mt-3 text-xs italic leading-relaxed text-slate-600">“{r.text}”</p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] font-medium text-brand-link">
                  <span className="text-brand-link">✓</span>
                  <span>Verified Droovee trip</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/15">
              <span className="text-accent">★★★★★</span>
              <span>4.9/5 from 1,000+ local trips</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faqs" className="bg-brand-soft py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Clear answers
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl">Frequently asked questions</h2>
          </div>

          <div className="mt-8 space-y-3">
            {FAQS.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-slate-200/80 bg-white p-5 transition-all open:border-slate-300 open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-brand-ink">
                  <span>{item.q}</span>
                  <span className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-180 group-open:bg-brand-soft group-open:text-brand-link">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA + CONTACT */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-brand-ink px-8 py-10 text-white shadow-xl md:px-12 md:py-14">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-slate-300">Ready when you are</span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Book a verified driver in minutes</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 md:text-base">
                  Sign in, choose your trip, and we&apos;ll confirm a driver. No advance payment — pay after the trip.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/book" className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-brand-ink shadow-lg shadow-accent/25 transition hover:bg-accent-hover">
                    Book Now →
                  </Link>
                  <Link href="/track" className="rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                    Track a booking
                  </Link>
                </div>
              </div>

              <div className="grid gap-3">
                <a href={CONTACT_TEL} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-brand-ink transition hover:-translate-y-0.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-ink text-accent">☎</span>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Call dispatch · 24×7</p>
                    <p className="text-base font-bold text-brand-ink">{CONTACT_PHONE_DISPLAY}</p>
                  </div>
                </a>
                <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-white p-4 text-brand-ink transition hover:-translate-y-0.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366] text-white">✆</span>
                  <div>
                    <p className="text-xs font-medium text-slate-500">WhatsApp support</p>
                    <p className="text-base font-bold text-brand-ink">Chat with a dispatcher</p>
                  </div>
                </a>
                <p className="px-1 text-xs text-slate-400">Official Droovee number: {CONTACT_PHONE_DISPLAY}. We never ask for advance payments.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
