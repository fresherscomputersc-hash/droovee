import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Calculator } from "@/components/Calculator";
import { PriceList } from "@/components/PriceList";
import { Hero } from "@/components/Hero";
import { Reviews } from "@/components/Trust";
import { LinkButton } from "@/components/ui";

const STEPS = [
  { n: "1", t: "Book", d: "Tell us where, when and for how long. Add your car model and any notes." },
  { n: "2", t: "Review", d: "Our team checks driver availability and confirms your booking." },
  { n: "3", t: "Assign", d: "A trained driver is assigned to you." },
  { n: "4", t: "Drive", d: "The driver drives your own car. We keep you updated on status." },
];

export default function Home() {
  return (
    <PublicShell>
      <section className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <Hero />
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" id="pricing">
            <h2 className="text-lg font-semibold">Transparent pricing</h2>
            <p className="mt-1 text-sm text-slate-600">Live rates, set by our team. You see the final estimate before you confirm.</p>
            <PriceList />
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <p>· Tolls, parking, fuel and the driver's food, stay and return travel are paid by the customer.</p>
              <p>· Damage to your vehicle while our driver is driving is the driver's responsibility.</p>
            </div>
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
        <div className="mt-10">
          <Calculator />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Why Droovee</h2>
        <p className="mt-2 text-slate-600">Verified drivers, clear prices, and someone accountable on every trip.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { t: "Police-verified drivers", d: "Every driver is ID-checked and police-verified before their first trip." },
            { t: "Trained & uniformed", d: "Safe driving, customer behaviour, luggage handling — plus a uniform you can recognise." },
            { t: "Insured trips", d: "Ask our team about trip cover. Damage to your car while our driver is driving is the driver's responsibility." },
            { t: "Estimate up front", d: "See the fare — including any night charge — before you confirm. No hidden charges." },
            { t: "Track every booking", d: "Booking ID + mobile number is all you need. No account required." },
            { t: "Human support", d: "Call or WhatsApp us any time. One number, real people, open 24×7." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="font-semibold"><span className="mr-2 text-emerald-600">✓</span>{c.t}</p>
              <p className="mt-1 text-sm text-slate-600">{c.d}</p>
            </div>
          ))}
        </div>
        <h3 className="mt-10 text-lg font-semibold tracking-tight">What customers say</h3>
        <Reviews />
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12">
          <div>
            <h2 className="text-xl font-semibold">Need a driver now?</h2>
            <p className="mt-1 text-slate-600">Immediate and scheduled bookings are both available. Out late? Our <Link href="/packages" className="font-medium text-emerald-700 underline">sober driver</Link> drives you home in your own car.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/faq" className="rounded-lg bg-white px-5 py-3 font-medium ring-1 ring-slate-300 hover:bg-slate-50">Read FAQ</Link>
            <Link href="/book" className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700">Start a booking</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
