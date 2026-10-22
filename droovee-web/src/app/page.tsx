import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Calculator } from "@/components/Calculator";
import { PriceList } from "@/components/PriceList";
import { Hero } from "@/components/Hero";
import { Reviews } from "@/components/Trust";

const STEPS = [
  {
    n: "01",
    t: "Book Online Instantly",
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
        {/* Ambient emerald radial glow */}
        <div className="pointer-events-none absolute inset-0 -top-40 flex justify-center opacity-25" aria-hidden="true">
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
            className="card-shine droovee-card-shadow-dark rounded-3xl border border-slate-700/60 bg-white p-7 text-slate-900 backdrop-blur-xl md:p-8"
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

            <div className="mt-5 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200/70">
              <p className="flex items-start gap-2 font-medium text-slate-700">
                <span className="text-emerald-600 font-bold">✓</span>
                Tolls, parking, and fuel are supplied by customer.
              </p>
              <p className="flex items-start gap-2 font-medium text-slate-700">
                <span className="text-emerald-600 font-bold">✓</span>
                Vehicle damage while our driver is driving is our direct responsibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: TRIP OPTIONS (udrivo style grid of interactive cards with card-shine) */}
      <section id="services" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
              Tailored For You
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Trip Options
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Looking for a driver on an hourly, daily, or outstation basis in Bhubaneswar? Book a verified chauffeur for your personal vehicle with transparent pricing.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "In-City & Hourly",
                desc: "Local shopping, meetings, doctor visits, and daily errands inside Bhubaneswar.",
                href: "/services/hourly",
                tag: "Starts ₹99/hr",
                icon: (
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.6 3.2 1.9-.9 1.5L11 13.5V7h2v5.6z" />
                ),
              },
              {
                title: "One-Way Outstation",
                desc: "Direct drops to Cuttack, Puri, Konark, Paradip, or Berhampur without return obligations.",
                href: "/services/outstation_one_way",
                tag: "Fixed or Per Km",
                icon: (
                  <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6L13 5z" />
                ),
              },
              {
                title: "Round-Trip Outstation",
                desc: "Same-day or multi-day temple tours, business visits, and vacation road trips.",
                href: "/services/outstation_round_trip",
                tag: "Multi-Day Ready",
                icon: (
                  <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L14 10h6V4l-2.35 2.35z" />
                ),
              },
              {
                title: "Airport & Station Pickup",
                desc: "Punctual terminal greeting at Biju Patnaik Airport and Bhubaneswar Railway Station.",
                href: "/services/airport_pickup_drop",
                tag: "Flight-Tracked",
                icon: (
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                ),
              },
              {
                title: "Half-Day City Driver",
                desc: "Flexible 4-hour driver block for medical appointments, shopping sprees, and business runs.",
                href: "/services/half_day",
                tag: "Fixed ₹599",
                icon: (
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                ),
              },
              {
                title: "Corporate & Monthly",
                desc: "Dedicated daily commute drivers for executives, doctors, and institutions with GST invoicing.",
                href: "/packages",
                tag: "Custom Billing",
                icon: (
                  <path d="M4 21V3h10v6h6v12H4zm2-2h2v-2H6v2zm0-4h2v-2H6v2zm0-4h2V9H6v2zm0-4h2V5H6v2zm4 12h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V9h-2v2zm0-4h2V5h-2v2zm4 12h4v-2h-2v-2h2v-2h-2v-2h2V9h-4v10z" />
                ),
              },
            ].map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="card-shine droovee-card-shadow group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-emerald-400 shadow-md transition group-hover:bg-emerald-600 group-hover:text-white">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                        {s.icon}
                      </svg>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                      {s.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <span>Explore service</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: CHARGES & TRANSPARENCY (udrivo style dark slate section) */}
      <section id="charges" className="py-20 bg-[#0F172A] text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              Clear & Fair
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              How Much Does It Cost to Hire a Driver in Bhubaneswar?
            </h2>
            <p className="mt-3 text-base text-slate-300 leading-relaxed">
              Droovee acting driver charges are completely transparent and predictable. Pay only for the duration you use with zero hidden commissions.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="card-shine droovee-card-shadow-dark group flex flex-col items-center rounded-2xl bg-white p-7 text-center text-slate-900 transition hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-950">Starts From ₹99</h3>
              <p className="mt-2 text-sm text-slate-600">
                Special intro rate for the first hour with coupon <strong className="text-emerald-700">LAUNCH99</strong>.
              </p>
            </div>

            <div className="card-shine droovee-card-shadow-dark group flex flex-col items-center rounded-2xl bg-white p-7 text-center text-slate-900 transition hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-950">Zero Rain/Rush Surges</h3>
              <p className="mt-2 text-sm text-slate-600">
                Fixed and honest pricing throughout Bhubaneswar. No 2x or 3x holiday surge markups.
              </p>
            </div>

            <div className="card-shine droovee-card-shadow-dark group flex flex-col items-center rounded-2xl bg-white p-7 text-center text-slate-900 transition hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.1-4.1 1.4 1.4L11 16z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-950">Pay After Completion</h3>
              <p className="mt-2 text-sm text-slate-600">
                Inspect your car and trip summary first. Pay easily by Cash or UPI directly to the driver.
              </p>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/book"
              className="rounded-full bg-emerald-500 px-8 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 hover:scale-105"
            >
              Get Exact Fare Estimate →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 3: WHY HIRE WITH DROOVEE (udrivo style trust cards + key counters) */}
      <section id="why-droovee" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
              Trust & Safety
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Why Car Owners Choose Droovee
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              We treat your car with absolute care. Every driver undergoes background vetting, strict road testing, and behavioral training.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((c) => (
              <div
                key={c.t}
                className="card-shine droovee-card-shadow flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-400"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-2xl ring-1 ring-slate-200">
                  {c.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{c.t}</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{c.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof Metric Counters (udrivo style 4-column metric bar) */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-shine droovee-card-shadow rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">10K+</p>
              <p className="mt-1.5 text-xs font-medium text-slate-500">Safe Trips Completed</p>
            </div>
            <div className="card-shine droovee-card-shadow rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">100%</p>
              <p className="mt-1.5 text-xs font-medium text-slate-500">Police-Verified Drivers</p>
            </div>
            <div className="card-shine droovee-card-shadow rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">8 Hubs</p>
              <p className="mt-1.5 text-xs font-medium text-slate-500">Covered in Bhubaneswar</p>
            </div>
            <div className="card-shine droovee-card-shadow rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">4.9/5</p>
              <p className="mt-1.5 text-xs font-medium text-slate-500">Average Customer Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS (udrivo style numbered 4-step workflow) */}
      <section id="how-it-works" className="py-20 bg-[#0F172A] text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              Quick & Easy
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              How to Book a Driver in 4 Easy Steps
            </h2>
            <p className="mt-3 text-base text-slate-300">
              Simple, fast, and completely hassle-free without long registration barriers.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative flex flex-col items-center rounded-2xl bg-white p-6 text-center text-slate-900 shadow-xl"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F172A] text-sm font-bold text-emerald-400">
                  {s.n}
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{s.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>

          {/* Interactive Calculator Drawer */}
          <div className="mt-14 overflow-hidden rounded-3xl border border-slate-800 bg-white p-6 text-slate-900 shadow-2xl md:p-8">
            <Calculator />
          </div>
        </div>
      </section>

      {/* SECTION 5: CUSTOMER EXPERIENCES (udrivo style review cards with avatar placeholders & stars) */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
              Verified Stories
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Happy Car Owners in Bhubaneswar
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Read how local car owners rely on Droovee for daily commutes, night returns, and weekend getaways.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Alok Pattnaik",
                role: "Patia, Bhubaneswar",
                service: "Outstation (Puri & Konark)",
                stars: 5,
                text: "Booked a driver for our family trip to Puri and Konark. Ramesh was punctual, courteous, and drove very smoothly. No speed violations. Complete peace of mind for my Creta.",
              },
              {
                name: "Priyadarshini Mishra",
                role: "Nayapalli, Bhubaneswar",
                service: "Half-Day City Driver",
                stars: 5,
                text: "Had multiple meetings across IRC Village, Secretariat, and Khandagiri. Took the 4-hour half-day service for ₹599. The driver handled peak traffic and parking smoothly.",
              },
              {
                name: "Dr. B. K. Mohanty",
                role: "Saheed Nagar",
                service: "Daily Medical Transit",
                stars: 5,
                text: "I use Droovee for regular hospital and clinic transit. Knowing that vehicle safety while driving is their direct responsibility makes all the difference compared to random gig apps.",
              },
              {
                name: "Soumya Ranjan Jena",
                role: "Chandrasekharpur",
                service: "Airport Terminal Transfer",
                stars: 5,
                text: "Flight arrived at 11:30 PM at Biju Patnaik Airport. Driver Prakash was already waiting at the arrival terminal with my car keys. Reached home comfortably with zero stress.",
              },
              {
                name: "Rashmi Rekha Swain",
                role: "Khandagiri, Bhubaneswar",
                service: "Full-Day Wedding Driver",
                stars: 5,
                text: "Hired a full-day driver (₹1,099) for our sister's wedding shopping and guest pickups across Bhubaneswar and Cuttack. Extremely polite driver, clean uniform, and zero hassle.",
              },
              {
                name: "Debashis Tripathy",
                role: "KIIT Road, Patia",
                service: "Hourly City Driver",
                stars: 5,
                text: "First time hiring a driver for my automatic Honda City. Was initially skeptical, but the driver was highly skilled, understood CVT gearboxes, and drove like a true professional.",
              },
              {
                name: "Ananya Mohapatra",
                role: "Baramunda, Bhubaneswar",
                service: "Hospital Visit Assistance",
                stars: 5,
                text: "My senior citizen parents needed to visit AIIMS Bhubaneswar for routine checkups. The assigned driver escorted them respectfully and waited patiently throughout.",
              },
              {
                name: "Manoj Kumar Sahoo",
                role: "Rasulgarh, Bhubaneswar",
                service: "Monthly Office Commute",
                stars: 5,
                text: "We have been using the customized monthly office commute package. Having a verified, punctual driver everyday completely eliminated my daily driving fatigue.",
              },
              {
                name: "Subhashree Senapati",
                role: "Old Town, Bhubaneswar",
                service: "Outstation Round-Trip (Satapada)",
                stars: 5,
                text: "Needed a round-trip driver to Chilika (Satapada) on a Sunday. Driver knew the route well, suggested good family stopovers, and reached back safely before dark.",
              },
            ].map((r, i) => (
              <div
                key={i}
                className="card-shine droovee-card-shadow relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 text-sm">
                        {r.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.role}</p>
                      </div>
                    </div>
                    <span className="text-amber-400 text-sm">{"★".repeat(r.stars)}</span>
                  </div>
                  <p className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                    {r.service}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 italic">
                    “{r.text}”
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                  <svg className="h-3.5 w-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Verified Droovee Trip</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white shadow-md">
              <span className="text-amber-400">★★★★★</span>
              <span>4.9/5 from 1,000+ local trips</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FREQUENTLY ASKED QUESTIONS (udrivo style modern accordion) */}
      <section id="faqs" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
              Clear Answers
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Everything you need to know about booking, driver verification, and fares.
            </p>
          </div>

          <div className="mt-12 space-y-3">
            {[
              {
                q: "Are all Droovee drivers police-verified and licensed?",
                a: "Yes. Every driver on our platform undergoes a thorough verification process, Aadhaar/driving license checks, and local police verification before being assigned.",
              },
              {
                q: "What happens if my car gets damaged while the driver is driving?",
                a: "Vehicle damage while our driver is driving is our direct operational responsibility. Please inform our operations dispatch immediately so we can record and resolve it.",
              },
              {
                q: "Who covers fuel, tolls, parking, and outstation stay?",
                a: "Tolls, parking fees, and vehicle fuel are always supplied by the customer. For outstation trips, the customer provides or reimburses driver food and overnight lodging.",
              },
              {
                q: "Do I need to pay before the trip begins?",
                a: "No advance payment is needed for local trips! You pay cash or UPI directly to the driver after completing the ride and inspecting your vehicle.",
              },
              {
                q: "Can I book a driver in advance?",
                a: "Yes. You can schedule in advance for tomorrow, next week, or book for immediate dispatch (arriving at your doorstep in 30 minutes in Bhubaneswar).",
              },
              {
                q: "Do I need to download an app or register an account to book?",
                a: "No! You can use Fast Booking with just your phone number and pickup address in one step. Just remember to save your Booking ID to track live updates.",
              },
            ].map((item, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 transition-all open:border-emerald-500/40 open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-slate-900">
                  <span>{item.q}</span>
                  <span className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-180 group-open:bg-emerald-100 group-open:text-emerald-700">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: NEED HELP 24/7 (udrivo style support contact cards) */}
      <section className="py-16 bg-[#0F172A] text-white">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              We're Here For You
            </span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Need Help With Your Booking?</h2>
            <p className="mt-2 text-sm text-slate-300">
              Our Bhubaneswar dispatch team is active 24/7. Reach out directly anytime.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href="tel:+919876543210"
              className="card-shine droovee-card-shadow-dark group flex items-center gap-4 rounded-2xl bg-white p-5 text-slate-900 transition hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1l-2.2 2.2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Call Dispatch Center</p>
                <p className="text-base font-bold text-slate-900">+91 98765 43210</p>
                <p className="text-[11px] text-emerald-700 font-semibold">Available 24×7</p>
              </div>
            </a>

            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="card-shine droovee-card-shadow-dark group flex items-center gap-4 rounded-2xl bg-white p-5 text-slate-900 transition hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.6.8-.4 1.1.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.6 1.3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Instant WhatsApp Support</p>
                <p className="text-base font-bold text-slate-900">Chat with Dispatcher</p>
                <p className="text-[11px] text-emerald-700 font-semibold">Response under 5 mins</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] px-8 py-12 text-white shadow-xl md:px-14 md:py-16">
            <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                  Instant & Scheduled Dispatch
                </span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Ready to experience stress-free car travel?
                </h2>
                <p className="mt-2 text-sm text-slate-300 md:text-base leading-relaxed">
                  Doorstep driver arrival in 30 minutes anywhere in Bhubaneswar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/faq"
                  className="rounded-full border border-slate-700 bg-slate-800 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  View FAQ
                </Link>
                <Link
                  href="/book"
                  className="rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 hover:scale-105"
                >
                  Hire a Driver Now →
                </Link>
              </div>
              <div className="mt-4 text-xs text-slate-400">
                <span>Looking to manage existing bookings or save your car details?</span>{" "}
                <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
                  Customer Sign In
                </Link>{" "}
                •{" "}
                <Link href="/register" className="font-semibold text-slate-300 hover:text-white hover:underline">
                  Register as Member
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
