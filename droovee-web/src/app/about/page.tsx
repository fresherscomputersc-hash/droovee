import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";
import { CONTACT_ADDRESS, CONTACT_PHONE_DISPLAY } from "@/lib/contact";

async function getBusiness() {
  try {
    const base = process.env.API_TARGET ?? "http://127.0.0.1:4000";
    const r = await fetch(`${base}/api/v1/business`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export default async function AboutPage() {
  const biz = await getBusiness();
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">About Droovee</h1>
        <Card>
          <p className="text-sm text-slate-600">
            Droovee is a 24×7 company-managed driver service in Bhubaneswar, Odisha. Our trained,
            verified drivers drive <strong>your own car</strong> — hourly, half-day, full-day,
            outstation, airport pickups and monthly office runs.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Every driver is ID-checked and police-verified. You see the fare estimate before
            confirming, and you can track every booking with just your booking ID or mobile number.
          </p>
        </Card>
        {(biz?.insuranceProvider || biz?.insuranceCoverageNote) && (
          <Card>
            <h2 className="font-semibold">Insurance cover</h2>
            {biz.insuranceProvider && <p className="mt-2 text-sm text-slate-600">Insured with {biz.insuranceProvider}.</p>}
            {biz.insuranceCoverageNote && <p className="mt-1 text-sm text-slate-600">{biz.insuranceCoverageNote}</p>}
          </Card>
        )}
        <Card>
          <h2 className="font-semibold">Reach us</h2>
          <p className="mt-2 text-sm text-slate-600">{CONTACT_ADDRESS}</p>
          <p className="mt-1 text-sm text-slate-600">Phone / WhatsApp: {CONTACT_PHONE_DISPLAY}</p>
          {biz?.supportReplyTarget && <p className="mt-1 text-sm text-slate-600">{biz.supportReplyTarget}</p>}
        </Card>
      </div>
    </PublicShell>
  );
}
