import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { LinkButton } from "@/components/ui";

const SERVICES = [
  { title: "Hourly driver", price: "₹149", note: "for 1 hour · extra hours ₹89/hour", id: "hourly" },
  { title: "Half-day driver", price: "₹379", note: "for 4 hours", id: "half" },
  { title: "Full-day driver", price: "₹849", note: "for 8 hours", id: "full" },
  { title: "Monthly office pickup & drop", price: "₹5,999", note: "per month", id: "monthly" },
  { title: "Outstation — one way", price: "₹199", note: "per hour", id: "out1" },
  { title: "Outstation — round trip", price: "₹169", note: "per hour · night halt ₹399/night", id: "out2" },
  { title: "Airport / railway / bus-stop pickup & drop", price: "₹159", note: "per hour", id: "airport" },
];

const STEPS = [
  { n: "1", t: "Book", d: "Tell us where, when and for how long. Add your car model and any notes." },
  { n: "2", t: "Review", d: "Our team checks driver availability and confirms your booking." },
  { n: "3", t: "Assign", d: "A salaried, trained driver is assigned to you." },
  { n: "4", t: "Drive", d: "The driver drives your own car. We keep you updated on status." },
];

export default function Home() {
  return (
    <PublicShell>
      <section className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Bhubaneswar · Open 24×7</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">A professional driver for your own car.</h1>
            <p className="mt-4 text-lg text-slate-600">
              Hourly, half-day, full-day, outstation, airport pickups and monthly office runs. Book in minutes and track your booking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/book">Book a driver</LinkButton>
              <LinkButton href="/register" variant="secondary">Create account</LinkButton>
            </div>
            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Launch offer:</strong> first hour at <strong>₹99</strong> with a coupon code. Enter the code at checkout.
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" id="pricing">
            <h2 className="text-lg font-semibold">Transparent pricing</h2>
            <p className="mt-1 text-sm text-slate-600">Advertised rates. You see the final estimate before you confirm.</p>
            <ul className="mt-4 divide-y divide-slate-100">
              {SERVICES.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.note}</p>
                  </div>
                  <p className="whitespace-nowrap font-semibold">{s.price}</p>
                </li>
              ))}
              <li className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">Late-night service (10 PM–6 AM)</p>
                  <p className="text-xs text-slate-500">additional charge</p>
                </div>
                <p className="whitespace-nowrap font-semibold">+₹99</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-sm font-semibold text-white">{s.n}</p>
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12">
          <div>
            <h2 className="text-xl font-semibold">Need a driver now?</h2>
            <p className="mt-1 text-slate-600">Immediate and scheduled bookings are both available. Our team can also be reached by phone or WhatsApp.</p>
          </div>
          <Link href="/book" className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700">Start a booking</Link>
        </div>
      </section>
    </PublicShell>
  );
}
