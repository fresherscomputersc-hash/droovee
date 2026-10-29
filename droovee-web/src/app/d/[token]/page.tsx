"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input, StatusBadge } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

const API = "/api/v1";

/** Driver job link: confirm, on-the-way, arrived, start/end with customer codes, car photos. No app, no login. */
export default function DriverJobPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [job, setJob] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  const load = useCallback(async () => {
    try {
      setJob(await api(`/driver/j/${token}`, { auth: false }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this job.");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(path: string, body?: unknown, ok?: string, isUpload?: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (isUpload) {
        const fd = new FormData();
        if (files) for (const f of Array.from(files)) fd.append("photos", f);
        const r = await fetch(`${API}/driver/j/${token}${path}`, { method: "POST", body: fd });
        if (!r.ok) {
          const t = await r.json().catch(() => ({}));
          throw new ApiError(r.status, t.code ?? "ERROR", t.message ?? "Upload failed.", t.fieldErrors);
        }
      } else {
        await api(`/driver/j/${token}${path}`, { method: "POST", body: body ?? {}, auth: false });
      }
      if (ok) setNotice(ok);
      setCode("");
      setFiles(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !job) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-xl px-4 py-10"><Alert>{error}</Alert></div>
      </PublicShell>
    );
  }
  if (!job) return <PublicShell><div className="p-10 text-sm text-slate-500">Loading job…</div></PublicShell>;

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Job</p>
            <h1 className="font-mono text-2xl font-semibold">{job.bookingNumber}</h1>
          </div>
          <StatusBadge status={job.status} />
        </div>
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <Card>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd className="font-medium">{SERVICE_LABEL[job.serviceType] ?? job.serviceType}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Start</dt><dd className="font-medium">{dateTime(job.scheduledStart)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Customer</dt><dd className="font-medium">{job.customer?.name} · {job.customer?.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Car</dt><dd className="font-medium">{job.carModel} · {job.transmission}</dd></div>
            <div><dt className="text-slate-500">Pickup</dt><dd className="font-medium">{job.pickup?.address}</dd></div>
            {job.destination?.address && <div><dt className="text-slate-500">Drop</dt><dd className="font-medium">{job.destination.address}</dd></div>}
            {job.instructions && <div><dt className="text-slate-500">Notes</dt><dd className="font-medium">{job.instructions}</dd></div>}
          </dl>
          <div className="mt-3 flex gap-2">
            <a href={`tel:${job.customer?.phone}`} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-brand-ink">Call customer</a>
            <a href={`https://wa.me/${String(job.customer?.phone ?? "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-slate-300">WhatsApp</a>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Job steps</h2>
          <div className="mt-4 space-y-3">
            {job.status === "driver_assigned" && !job.driverConfirmed && (
              <Button onClick={() => act("/confirm", undefined, "Job confirmed.")} disabled={busy} className="w-full">1. Confirm this job</Button>
            )}
            {job.status === "driver_assigned" && job.driverConfirmed && (
              <Button onClick={() => act("/on-the-way", undefined, "Marked on the way.")} disabled={busy} className="w-full">2. I'm on the way</Button>
            )}
            {(job.status === "driver_assigned" || job.status === "driver_on_the_way") && !job.driverArrived && (
              <Button variant="secondary" onClick={() => act("/arrived", undefined, "Marked arrived.")} disabled={busy} className="w-full">3. I've arrived</Button>
            )}
            {job.status === "driver_on_the_way" && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="START code from customer">
                    <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={4} placeholder="4 digits" />
                  </Field>
                </div>
                <div className="flex items-end"><Button onClick={() => act("/start", { code }, "Trip started.")} disabled={busy || code.length !== 4}>Start trip</Button></div>
              </div>
            )}
            {job.status === "in_progress" && !job.tripEnded && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="END code from customer">
                    <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={4} placeholder="4 digits" />
                  </Field>
                </div>
                <div className="flex items-end"><Button onClick={() => act("/end", { code }, "Trip ended. Our team completes the fare.")} disabled={busy || code.length !== 4}>End trip</Button></div>
              </div>
            )}
            {job.tripEnded && <Alert tone="success">Trip ended. Our team will complete the fare with the customer.</Alert>}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Pre-trip car photos ({job.photoCount})</h2>
          <p className="mt-1 text-xs text-slate-500">Take photos of the car before the trip — they protect you and the customer.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label="Photos (JPG/PNG, max 6MB each)">
              <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(e.target.files)} />
            </Field>
            <Button variant="secondary" onClick={() => act("/photos", undefined, "Photos uploaded.", true)} disabled={busy || !files?.length}>Upload</Button>
          </div>
        </Card>

        <p className="text-xs text-slate-500">Current step: {STATUS_LABEL[job.status] ?? job.status}. Wrong link? Ask the Droovee team for a new one.</p>
      </div>
    </PublicShell>
  );
}
