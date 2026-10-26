import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of service</h1>
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Droovee provides a driver for your own car. You confirm your car is roadworthy, insured and has fuel.</li>
            <li>Tolls, parking, fuel and the driver's food, stay and return travel are paid by you (the customer).</li>
            <li>Damage to your vehicle while our driver is driving is the driver's responsibility. Report it to us immediately.</li>
            <li>Traffic fines caused by the driver's fault are the driver's responsibility; fines caused by the vehicle (papers, permits) are yours.</li>
            <li>The fare estimate is not final. Our team confirms the final fare before your driver is assigned.</li>
            <li>Late-night trips (10 PM–6 AM) may carry an additional charge.</li>
            <li>Bookings are confirmed by our team, not instantly — we check driver availability first.</li>
          </ul>
        </Card>
      </div>
    </PublicShell>
  );
}
