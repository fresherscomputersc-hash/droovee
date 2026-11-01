import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";
import { CONTACT_ADDRESS, CONTACT_PHONE_DISPLAY } from "@/lib/contact";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "About Droovee — Professional Chauffeur Service in Bhubaneswar",
  description:
    "Learn about Droovee: Bhubaneswar's 24x7 company-managed driver service for your personal vehicle. Background-verified chauffeurs, transparent pricing, and complete peace of mind.",
  alternates: {
    canonical: "https://droovee.com/about",
  },
  openGraph: {
    title: "About Droovee — Professional Chauffeur Service in Bhubaneswar",
    description:
      "Bhubaneswar's trusted 24x7 company-managed driver service for your own car.",
    url: "https://droovee.com/about",
  },
};

export const revalidate = 300;

async function getBusiness() {
  try {
    const base = process.env.API_TARGET ?? "http://127.0.0.1:4000";
    const r = await fetch(`${base}/api/v1/business`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
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
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://droovee.com" },
          { name: "About Us", url: "https://droovee.com/about" },
        ]}
      />
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
