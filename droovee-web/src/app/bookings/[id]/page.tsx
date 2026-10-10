"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, StatusBadge, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { dateTime, money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

const PIPELINE = ["requested", "confirmed", "driver_assigned", "driver_on_the_way", "in_progress", "completed"] as const;
const DEAD_END = ["cancelled", "rejected", "customer_no_show"];

function Timeline({ status }: { status: string }) {
  const idx = PIPELINE.indexOf(status as (typeof PIPELINE)[number]);
  if (idx === -1) return null;
  return (
    <ol className="mt-4 space-y-0">
      {PIPELINE.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                  done ? "bg-emerald-600 text-white" : current ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {i < PIPELINE.length - 1 && <span className={`h-5 w-0.5 ${i < idx ? "bg-emerald-600" : "bg-slate-200"}`} />}
            </div>
            <div className="pb-5">
              <p className={`text-sm font-medium ${done || current ? "text-slate-900" : "text-slate-400"}`}>{STATUS_LABEL[s] ?? s}</p>
              {current && idx < PIPELINE.length - 1 && (
                <p className="text-xs text-slate-500">
                  {status === "requested" && "Our team reviews every request before confirming."}
                  {status === "confirmed" && "Finding you the right driver for this slot."}
                  {status === "driver_assigned" && "Your driver confirms with our team, then heads your way."}
                  {status === "driver_on_the_way" && "Your driver is on the way to your pickup."}
                  {status === "in_progress" && "Trip in progress. Sit back — the fare is settled at the end."}
                </p>
              )}
              {current && status === "completed" && <p className="text-xs text-slate-500">Trip complete. Thank you for riding with Droovee.</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function CustomerBookingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const [b, setB] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setB(await api(`/bookings/${params.id}`));
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "We couldn't find that booking." : "Could not load this booking.");
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s || s.kind !== "customer") {
      router.replace(`/login?next=/bookings/${params.id}`);
      return;
    }
    load();
    if (search.get("new")) setNotice("Booking request received. Our team will confirm it shortly.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function requestCancel(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setReasonErr("Tell us why you want to cancel (at least 3 characters).");
      return;
    }
    setBusy(true);
    setReasonErr(null);
    const wasPending = b.cancellationPending;
    try {
      await api(`/bookings/${params.id}/cancel`, { method: "POST", body: { reason: reason.trim() } });
      setNotice(wasPending ? "Cancellation request updated." : "Cancellation request sent. Our team will confirm any fees or refund.");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Alert>{error}</Alert>
          <Link href="/bookings" className="mt-4 inline-block text-sm text-emerald-700 underline">Back to my bookings</Link>
        </div>
      </PublicShell>
    );
  }
  if (!b) return <PublicShell><div className="p-10 text-sm text-slate-500">Loading…</div></PublicShell>;

  const cancellable = !["completed", "cancelled", "rejected", "customer_no_show"].includes(b.status);
  const deadEnd = DEAD_END.includes(b.status);
  const waNumber = b.driver?.phone ? String(b.driver.phone).replace(/\D/g, "") : "";

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Booking reference</p>
            <h1 className="font-mono text-2xl font-semibold">{b.bookingNumber}</h1>
          </div>
          <StatusBadge status={b.status} />
        </div>
        {notice && <Alert tone="success">{notice}</Alert>}

        <Card>
          <h2 className="font-semibold">Where's my booking?</h2>
          {deadEnd ? (
            <p className="mt-3 text-sm text-slate-600">
              This booking ended as <strong>{STATUS_LABEL[b.status] ?? b.status}</strong>. Book again any time — it takes a minute.
            </p>
          ) : (
            <Timeline status={b.status} />
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Trip</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Row k="Service" v={SERVICE_LABEL[b.serviceType] ?? b.serviceType} />
            <Row k="Start" v={dateTime(b.scheduledStart)} />
            <Row k="End" v={dateTime(b.scheduledEnd)} />
            <Row k="Pickup" v={b.pickup?.address} />
            {b.destination && <Row k="Destination" v={b.destination.address} />}
            <Row k="Car" v={`${b.carModel} · ${b.transmission}`} />
            {b.instructions && <Row k="Notes" v={b.instructions} />}
            {b.recurrence && <Row k="Schedule" v={`${b.recurrence.startTime}–${b.recurrence.endTime} on ${b.recurrence.days.length} days/week`} />}
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold">Driver</h2>
          {b.driver ? (
            <div className="mt-4">
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <Row k="Name" v={b.driver.name} />
                <Row k="Phone" v={b.driver.phone} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={`tel:${b.driver.phone}`} className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Call driver
                </a>
                {waNumber && (
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
                    WhatsApp driver
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">A driver will be assigned after our team confirms your booking. You'll see their details here.</p>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Fare</h2>
          <p className="mt-3 text-2xl font-semibold">{money(b.finalFare ?? b.estimate?.total)}</p>
          <p className="text-xs text-slate-500">{b.finalFare != null ? "Final fare" : "Estimate. Final fare may change and is confirmed by our team."}</p>
          {b.estimate?.lines?.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
              {b.estimate.lines.map((l: any, i: number) => (
                <li key={i} className="flex justify-between"><span className="text-slate-600">{l.label}</span><span>{money(l.amount)}</span></li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Cancel booking</h2>
          {b.cancellationPending ? (
            <div className="mt-3">
              <Alert tone="warn">You've asked to cancel this booking{b.cancelRequestReason ? <>: “{b.cancelRequestReason}”</> : "."} Our team will confirm any fee or refund.</Alert>
              <form onSubmit={requestCancel} className="mt-4 space-y-3" noValidate>
                <Field label="Update your reason">
                  <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={b.cancelRequestReason ?? ""} />
                </Field>
                <Button type="submit" variant="secondary" disabled={busy}>{busy ? "Sending…" : "Update request"}</Button>
              </form>
            </div>
          ) : b.cancellationRequested ? (
            <p className="mt-3 text-sm text-slate-600">You've asked to cancel this booking. Our team will confirm any fee or refund.</p>
          ) : cancellable ? (
            <form onSubmit={requestCancel} className="mt-4 space-y-3" noValidate>
              <Field label="Reason" error={reasonErr ?? undefined}>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <Button type="submit" variant="danger" disabled={busy}>{busy ? "Sending…" : "Request cancellation"}</Button>
              <p className="text-xs text-slate-500">Cancellation fees and refunds follow our policy. Our team decides each request.</p>
            </form>
          ) : (
            <p className="mt-3 text-sm text-slate-600">This booking can no longer be cancelled online. Please call or WhatsApp our team.</p>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}
