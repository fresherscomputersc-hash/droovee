"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input, StatusBadge } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";
import { DriverCard, EmergencyCard, HelpOnWhatsApp } from "@/components/Trust";
import { ShareLink } from "@/components/Rate";

const PIPELINE = ["requested", "confirmed", "driver_assigned", "driver_on_the_way", "in_progress", "completed"] as const;

function Timeline({ status }: { status: string }) {
  const idx = PIPELINE.indexOf(status as (typeof PIPELINE)[number]);
  if (idx === -1) return <p className="mt-3 text-sm">Status: {STATUS_LABEL[status] ?? status}</p>;
  return (
    <ol className="mt-4">
      {PIPELINE.map((s, i) => (
        <li key={s} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${i < idx ? "bg-emerald-600 text-white" : i === idx ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600" : "bg-slate-100 text-slate-400"}`}>{i < idx ? "✓" : i + 1}</span>
            {i < PIPELINE.length - 1 && <span className={`h-5 w-0.5 ${i < idx ? "bg-emerald-600" : "bg-slate-200"}`} />}
          </div>
          <div className="pb-5"><p className="text-sm font-medium">{STATUS_LABEL[s] ?? s}</p></div>
        </li>
      ))}
    </ol>
  );
}

function BookingCard({ b }: { b: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-xl font-semibold">{b.bookingNumber}</h2>
          <StatusBadge status={b.status} />
        </div>
        <Timeline status={b.status} />
      </Card>
      <Card>
        <h2 className="font-semibold">Trip</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd className="font-medium">{SERVICE_LABEL[b.serviceType] ?? b.serviceType}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Start</dt><dd className="font-medium">{dateTime(b.scheduledStart)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Pickup</dt><dd className="max-w-60 text-right font-medium">{b.pickup?.address}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Fare</dt><dd className="font-medium">{money(b.finalFare ?? b.estimate?.total)} <span className="text-xs text-slate-500">(estimate)</span></dd></div>
        </dl>
        <HelpOnWhatsApp bookingNumber={b.bookingNumber} />
      </Card>
      <DriverCard driver={b.driver} />
      {b.shareToken && (
        <Card>
          <h2 className="font-semibold">Share this trip with family</h2>
          <ShareLink token={b.shareToken} />
        </Card>
      )}
      <EmergencyCard bookingNumber={b.bookingNumber} />
    </div>
  );
}

function TrackForm() {
  const search = useSearchParams();
  const [mode, setMode] = useState<"id" | "phone">(search.get("phone") ? "phone" : "id");
  const [number, setNumber] = useState(search.get("bookingNumber") ?? "");
  const [phone, setPhone] = useState(search.get("phone") ?? "");
  const [single, setSingle] = useState<any | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSingle(null);
    setList(null);
    if (mode === "id" && !number.trim()) {
      setError("Enter your booking ID.");
      return;
    }
    if (mode === "phone" && !phone.trim()) {
      setError("Enter your mobile number.");
      return;
    }
    setBusy(true);
    try {
      const q = new URLSearchParams();
      if (mode === "id") {
        q.set("bookingNumber", number.trim());
        if (phone.trim()) q.set("phone", phone.trim());
        setSingle(await api(`/bookings/track?${q.toString()}`, { auth: false }));
      } else {
        q.set("phone", phone.trim());
        const r = await api<{ items: any[] }>(`/bookings/track?${q.toString()}`, { auth: false });
        setList(r.items);
      }
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "Nothing found. Check the booking ID or mobile number." : "Could not load. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Track my booking</h1>
        <p className="mt-1 text-sm text-slate-600">No password needed — use your booking ID or mobile number.</p>
      </div>
      <div className="flex gap-2">
        {(["id", "phone"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); setSingle(null); setList(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ring-1 ${mode === m ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-slate-300"}`}
          >
            {m === "id" ? "Booking ID" : "Mobile number"}
          </button>
        ))}
      </div>
      <Card>
        <form onSubmit={lookup} className="grid gap-4" noValidate>
          {mode === "id" ? (
            <>
              <Field label="Booking ID *">
                <Input value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="DRV-XXXXXXXX" className="font-mono" />
              </Field>
              <Field label="Mobile number (optional, for extra privacy)">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" />
              </Field>
            </>
          ) : (
            <Field label="Mobile number *">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" />
            </Field>
          )}
          <div><Button type="submit" disabled={busy}>{busy ? "Looking up…" : "Track"}</Button></div>
        </form>
      </Card>
      {error && <Alert>{error}</Alert>}
      {single && <BookingCard b={single} />}
      {list && (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">{list.length} booking{list.length === 1 ? "" : "s"} found.</p>
          {list.map((b) => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <PublicShell>
      <Suspense fallback={<div className="p-10 text-sm text-slate-500">Loading…</div>}>
        <TrackForm />
      </Suspense>
    </PublicShell>
  );
}
