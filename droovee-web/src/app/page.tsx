import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Hero } from "@/components/Hero";
import { PricingCta } from "@/components/PricingCta";
import { CONTACT_PHONE_DISPLAY, CONTACT_TEL, CONTACT_WHATSAPP } from "@/lib/contact";

const TRUST = [
  {
    title: "Police Verified Drivers",
    text: "Aadhaar, licence and police verification before assignment.",
    icon: (
      <>
        <path d="M12 3.25 19 6v5.6c0 4.2-2.9 7.6-7 9.15-4.1-1.55-7-4.95-7-9.15V6l7-2.75Z" />
        <path d="m9.1 12 2.05 2.05 3.75-4" />
      </>
    ),
  },
  {
    title: "Experienced Professional",
    text: "Trained, uniformed chauffeurs who know the city.",
    icon: (
      <>
        <circle cx="12" cy="7.2" r="3.1" />
        <path d="M5.5 20.3v-1.1a6.5 6.5 0 0 1 13 0v1.1" />
      </>
    ),
  },
  {
    title: "Premium Service",
    text: "A professional driver for your own car, every trip.",
    icon: (
      <>
        <path d="m12 3.6 2.55 5.2 5.75.83-4.15 4.05.98 5.72L12 16.7l-5.13 2.7.98-5.72L3.7 9.63l5.75-.83L12 3.6Z" />
      </>
    ),
  },
  {
    title: "Affordable Price",
    text: "Clear hourly and outstation rates, no hidden charges.",
    icon: (
      <>
        <path d="M20.6 13.1 13.1 20.6a2 2 0 0 1-2.83 0L3.4 13.73V3.4h10.33l6.87 6.87a2 2 0 0 1 0 2.83Z" />
        <circle cx="7.9" cy="7.9" r="1.35" />
      </>
    ),
  },
  {
    title: "Instant Booking",
    text: "Book online in minutes. No app download needed.",
    icon: (
      <>
        <path d="M13.3 2.8 5.5 13.4h5.2l-.8 7.8 7.8-10.6h-5.2l.8-7.8Z" />
      </>
    ),
  },
];

const SERVICES = [
  {
    title: "City",
    desc: "Shopping, meetings, hospital visits and daily errands across Bhubaneswar.",
    href: "/city",
  },
  {
    title: "Outstation",
    desc: "One-way or round-trip drivers to Puri, Cuttack, Konark and beyond.",
    href: "/outstation",
  },
  {
    title: "Airport Transfer",
    desc: "Punctual pickup and drop at Biju Patnaik Airport, railway and bus stations.",
    href: "/airport-transfer",
  },
  {
    title: "Monthly",
    desc: "A dedicated driver for your daily commute, with one monthly bill.",
    href: "/monthly",
  },
  {
    title: "Corporate",
    desc: "Daily commute drivers for offices, hospitals and institutions.",
    href: "/corporate",
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
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-5">
          {TRUST.map((t) => (
            <div
              key={t.title}
              className="droovee-card-shadow flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
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
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl">Our driver. Your car. Your plan.</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Hourly city trips, outstation drives, airport transfers and monthly commutes — all with verified chauffeurs.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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
