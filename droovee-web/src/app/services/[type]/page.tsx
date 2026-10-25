import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Card, LinkButton } from "@/components/ui";
import { SERVICE_LABEL } from "@/lib/format";

const CONTENT: Record<string, { title: string; body: string[]; cta: string }> = {
  hourly: {
    title: "Hourly driver on hire in Bhubaneswar",
    body: ["Need a driver for a few hours in Bhubaneswar? Our driver drives your own car — shopping, errands, appointments.", "Pay for the first hour, then per extra hour. Late-night trips (10 PM–6 AM) add ₹99."],
    cta: "Book an hourly driver",
  },
  half_day: {
    title: "Half-day driver in Bhubaneswar (4 hours)",
    body: ["A driver for half your day — office commutes, school runs, hospital visits.", "Fixed 4-hour package. First hour at ₹99 with LAUNCH99 for new customers."],
    cta: "Book a half-day driver",
  },
  full_day: {
    title: "Full-day driver in Bhubaneswar (8 hours)",
    body: ["One driver for your whole day — weddings, events, business travel across the city.", "Fixed 8-hour package with a trained, police-verified driver."],
    cta: "Book a full-day driver",
  },
  monthly_office: {
    title: "Monthly office pickup and drop in Bhubaneswar",
    body: ["Daily office commute with the same trusted driver. Set your working days and timings once.", "Monthly billing with GST invoice — ideal for offices, hospitals and schools."],
    cta: "Book a monthly plan",
  },
  outstation_one_way: {
    title: "Outstation one-way driver from Bhubaneswar",
    body: ["One-way drops to Puri, Konark, Cuttack and beyond — per-hour pricing, night halt extra only if needed.", "Tolls, parking, fuel and the driver's food/stay/return are paid by you."],
    cta: "Book a one-way trip",
  },
  outstation_round_trip: {
    title: "Outstation round-trip driver from Bhubaneswar",
    body: ["Same-day and multi-day round trips with night-halt pricing per night.", "Damage to your car while our driver is driving is the driver's responsibility."],
    cta: "Book a round trip",
  },
  airport_pickup_drop: {
    title: "Airport, railway and bus-stop pickup and drop in Bhubaneswar",
    body: ["Flight landing late? A driver waits for you at Biju Patnaik Airport, the railway station or the bus stop.", "Per-hour pricing. Share your terminal and our team tracks the rest."],
    cta: "Book an airport pickup",
  },
};

export function generateStaticParams() {
  return Object.keys(CONTENT).map((type) => ({ type }));
}

export default async function ServicePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const c = CONTENT[type];
  if (!c) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Service not found</h1>
          <Link href="/packages" className="text-emerald-700 underline">See all services</Link>
        </div>
      </PublicShell>
    );
  }
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs text-slate-500">Droovee · Bhubaneswar · Open 24×7</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{c.title}</h1>
        {c.body.map((p, i) => <p key={i} className="mt-4 text-slate-600">{p}</p>)}
        <Card>
          <h2 className="font-semibold">Why Droovee</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Police-verified, trained drivers</li>
            <li>Estimate up front — no hidden charges</li>
            <li>Live tracking with your booking ID</li>
            <li>Damage while our driver drives is the driver's responsibility</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <LinkButton href={`/book?service=${type}`}>{c.cta}</LinkButton>
            <LinkButton href="/packages" variant="secondary">Fixed-price packages</LinkButton>
          </div>
        </Card>
        <p className="mt-6 text-sm text-slate-500">
          Also see: {Object.entries(SERVICE_LABEL).filter(([t]) => t !== type).map(([t, l]) => <Link key={t} href={`/services/${t}`} className="mr-2 underline">{l}</Link>)}
        </p>
      </div>
    </PublicShell>
  );
}
