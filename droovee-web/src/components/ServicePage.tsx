import Image from "next/image";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { CONTACT_PHONE_DISPLAY, CONTACT_TEL, CONTACT_WHATSAPP } from "@/lib/contact";
import { BreadcrumbJsonLd, ServiceJsonLd } from "@/components/JsonLd";

/**
 * Shared layout for the five dedicated service pages.
 *
 * Every page is a server component that passes its own copy and image, so the
 * structure, spacing and brand treatment stay identical across routes. Booking
 * always goes through the existing /book deep link — no new booking logic.
 */
export type ServicePageContent = {
  /** Short label used in the "other services" cross-links. */
  label: string;
  /** Current route, used to exclude the page from its own cross-links. */
  href: string;
  eyebrow: string;
  title: string;
  intro: string;
  image: { src: string; alt: string };
  bookHref: string;
  bookLabel: string;
  highlights: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  notes: string[];
};

const ALL_SERVICES = [
  { href: "/city", label: "City driver", blurb: "Hourly errands across Bhubaneswar" },
  { href: "/outstation", label: "Outstation", blurb: "Puri, Cuttack, Konark and beyond" },
  { href: "/airport-transfer", label: "Airport transfer", blurb: "Biju Patnaik Airport pickups" },
  { href: "/monthly", label: "Monthly", blurb: "Daily commute, same driver" },
  { href: "/corporate", label: "Corporate", blurb: "Office and institutional plans" },
];

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4.75 12.9 9.6 17.6 19.25 7.1" />
    </svg>
  );
}

export function ServicePage({ content }: { content: ServicePageContent }) {
  const others = ALL_SERVICES.filter((s) => s.href !== content.href);

  return (
    <PublicShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://droovee.com" },
          { name: content.label, url: `https://droovee.com${content.href}` },
        ]}
      />
      <ServiceJsonLd
        name={content.title}
        description={content.intro}
        url={`https://droovee.com${content.href}`}
        serviceType={content.label}
      />
      {/* HERO */}
      <section className="bg-brand-ink text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-20">
          <div className="lg:col-span-7">
            <span className="inline-flex rounded-full border border-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">
              {content.eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
              {content.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-on-dark sm:text-lg">{content.intro}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={content.bookHref}
                className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-brand-ink shadow-lg shadow-accent/25 transition hover:scale-105 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
              >
                {content.bookLabel} →
              </Link>
              <a
                href={CONTACT_TEL}
                className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
              >
                Call {CONTACT_PHONE_DISPLAY}
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              No advance payment · Pay by cash or UPI after the trip
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10">
              <Image
                src={content.image.src}
                alt={content.image.alt}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl">What&rsquo;s included</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Every Droovee trip is driven by a trained, police-verified chauffeur in your own car.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.highlights.map((h) => (
              <div
                key={h.title}
                className="droovee-card-shadow rounded-2xl border border-slate-200/80 border-t-2 border-t-accent bg-white p-5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                  <Check />
                </span>
                <h3 className="mt-3 text-sm font-bold text-brand-ink">{h.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-brand-soft py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl">How it works</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Three steps from booking to your destination.
            </p>
          </div>

          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {content.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <span className="text-xs font-extrabold tracking-widest text-brand-link">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-bold text-brand-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* GOOD TO KNOW */}
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:gap-14 lg:px-10">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl">Good to know</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Fuel, tolls and parking are always paid by you — the driver handles the wheel.
            </p>
          </div>
          <ul className="space-y-3">
            {content.notes.map((n) => (
              <li key={n} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
                  <Check />
                </span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-ink py-14 text-white sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-10">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Ready to book a driver?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-on-dark">
            Pick your date and time, and our Bhubaneswar dispatch desk assigns a verified driver for your car.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={content.bookHref}
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-brand-ink shadow-lg shadow-accent/25 transition hover:scale-105 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
            >
              {content.bookLabel} →
            </Link>
            <a
              href={CONTACT_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* OTHER SERVICES */}
      <section className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Other services</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-ink/30 hover:bg-brand-soft"
              >
                <p className="text-sm font-bold text-brand-ink">{s.label}</p>
                <p className="mt-1 text-xs text-slate-600">{s.blurb}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-link">
                  Explore <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
