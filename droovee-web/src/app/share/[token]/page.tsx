"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Card, StatusBadge } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

const PIPELINE = ["requested", "confirmed", "driver_assigned", "driver_on_the_way", "in_progress", "completed"] as const;

/** Family share-trip link: driver name + live status. No login. */
export default function SharePage() {
  const params = useParams<{ token: string }>();
  const [s, setS] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api(`/driver/share/${params.token}`, { auth: false })
      .then(setS)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load this trip."));
    const t = setInterval(() => {
      api(`/driver/share/${params.token}`, { auth: false }).then(setS).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [params.token]);

  if (error) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-xl px-4 py-10"><Alert>{error}</Alert></div>
      </PublicShell>
    );
  }
  if (!s) return <PublicShell><div className="p-10 text-sm text-slate-500">Loading trip…</div></PublicShell>;

  const idx = PIPELINE.indexOf(s.status);
  return (
    <PublicShell>
      <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Shared trip {s.bookingNumber}</p>
            <h1 className="text-xl font-semibold">{s.driver ? `${s.driver.name} is driving` : "Finding a driver…"}</h1>
          </div>
          <StatusBadge status={s.status} />
        </div>
        <Card>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd className="font-medium">{SERVICE_LABEL[s.serviceType] ?? s.serviceType}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Start</dt><dd className="font-medium">{dateTime(s.scheduledStart)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-medium">{STATUS_LABEL[s.status] ?? s.status}</dd></div>
            {s.driverArrived && <div className="flex justify-between"><dt className="text-slate-500">Driver</dt><dd className="font-medium text-emerald-700">Arrived at pickup ✓</dd></div>}
            {s.tripEnded && <div className="flex justify-between"><dt className="text-slate-500">Trip</dt><dd className="font-medium">Ended ✓</dd></div>}
          </dl>
          {idx >= 0 && (
            <ol className="mt-4">
              {PIPELINE.map((p, i) => (
                <li key={p} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${i < idx ? "bg-emerald-600 text-white" : i === idx ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600" : "bg-slate-100 text-slate-400"}`}>{i < idx ? "✓" : i + 1}</span>
                    {i < PIPELINE.length - 1 && <span className={`h-5 w-0.5 ${i < idx ? "bg-emerald-600" : "bg-slate-200"}`} />}
                  </div>
                  <div className="pb-5"><p className="text-sm font-medium">{STATUS_LABEL[p] ?? p}</p></div>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <p className="text-xs text-slate-500">Shared by the customer via Droovee. Status refreshes automatically.</p>
      </div>
    </PublicShell>
  );
}
