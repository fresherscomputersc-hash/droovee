import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";

const FAQS = [
  { q: "Who pays for tolls, parking and fuel?", a: "You (the customer) pay tolls, parking and fuel on all trips, including outstation trips." },
  { q: "Who pays for the driver's food, stay and return travel?", a: "The customer pays for the driver's food, stay and return travel on outstation trips." },
  { q: "What if my car is damaged while the driver is driving?", a: "Damage to your vehicle while our driver is driving is the driver's responsibility. Tell our team immediately so we can record it and resolve it." },
  { q: "What if my driver is late?", a: "Call or WhatsApp us on the number on this site and we'll sort it out — a replacement driver or a revised plan. Waiting charges, if any, follow our cancellation policy." },
  { q: "Do I need an account to book?", a: "Yes. Sign in or create a free account in under a minute. Your trips, invoices and support history stay in one place." },
  { q: "How do I track my booking?", a: "Open Track booking and enter your booking ID or your mobile number. No password needed for tracking." },
  { q: "When do I pay?", a: "Choose Cash/UPI or Online when booking. The estimate is shown up front; the final fare is confirmed by our team." },
  { q: "What is the late-night charge?", a: "Trips starting between 10 PM and 6 AM may carry an additional late-night charge. Sign in to see the current rate." },
  { q: "Do you have any offers?", a: "Any active offers are shown on your signed-in pricing page." },
];

export default function FaqPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h1>
        {FAQS.map((f) => (
          <Card key={f.q}>
            <p className="font-semibold">{f.q}</p>
            <p className="mt-1 text-sm text-slate-600">{f.a}</p>
          </Card>
        ))}
      </div>
    </PublicShell>
  );
}
