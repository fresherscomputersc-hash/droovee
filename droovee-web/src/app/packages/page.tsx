"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Card, LinkButton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/format";
import { CONTACT_TEL, CONTACT_WHATSAPP } from "@/lib/contact";

/** Ready-made fixed-price packages + corporate plans. */
export default function PackagesPage() {
  const [pkgs, setPkgs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ packages: any[] }>("/services", { auth: false })
      .then((r) => setPkgs(r.packages))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load packages."));
  }, []);

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Fixed-price packages</h1>
        <p className="mt-1 text-sm text-slate-600">One price, no surprises. Tap to book — the form comes prefilled.</p>
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {(pkgs ?? []).map((p) => (
            <Card key={p.id}>
              <p className="font-semibold">{p.name}</p>
              <p className="mt-1 text-sm text-slate-600">{p.description}</p>
              <p className="mt-3 text-2xl font-semibold">{money(p.fixedPrice)}</p>
              <div className="mt-4"><LinkButton href={`/book?package=${encodeURIComponent(p.id)}`}>Book this package</LinkButton></div>
            </Card>
          ))}
        </div>
        {pkgs?.length === 0 && <p className="mt-4 text-sm text-slate-500">No packages right now — book any service instead.</p>}

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="font-semibold">✈️ Airport, Railway & Outstation Travel</h2>
            <p className="mt-2 text-sm text-slate-600">Landing at Biju Patnaik Airport or planning an outstation trip to Puri, Cuttack or Konark? Transparent ₹199/hr hourly rate with verified highway drivers.</p>
            <div className="mt-4"><LinkButton href="/book?service=airport_pickup_drop">Book airport transfer</LinkButton></div>
          </Card>
          <Card>
            <h2 className="font-semibold">🏢 Corporate & monthly plans</h2>
            <p className="mt-2 text-sm text-slate-600">Offices, hospitals, showrooms, schools: daily office runs and monthly billing with GST invoice. Steady drivers who know your routes.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={CONTACT_TEL} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Call us</a>
              <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-slate-300">WhatsApp us</a>
            </div>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}
