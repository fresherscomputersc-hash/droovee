"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input, StatusBadge } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

interface DriverSession {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  experienceYears?: number;
  languages?: string[];
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverSession | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal / Prompt states for start/end codes and cash collection
  const [codePromptJob, setCodePromptJob] = useState<{ id: string; action: "start" | "end" } | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [cashPromptJob, setCashPromptJob] = useState<{ id: string; fare: number } | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("droovee_driver_session");
      if (!stored) {
        router.replace("/driver/login");
        return;
      }
      try {
        setDriver(JSON.parse(stored));
      } catch {
        router.replace("/driver/login");
      }
    }
  }, [router]);

  const loadJobs = useCallback(async (driverId: string) => {
    setLoading(true);
    try {
      const res = await api<{ items: any[] }>(`/driver/portal/jobs?driverId=${driverId}`, { auth: false });
      setJobs(res.items);
    } catch (err) {
      setError("Could not load your trips. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (driver?.id) {
      loadJobs(driver.id);
    }
  }, [driver, loadJobs]);

  function handleSignOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("droovee_driver_session");
    }
    router.replace("/driver/login");
  }

  async function performAction(
    bookingId: string,
    action: "confirm" | "on-the-way" | "arrived" | "start" | "end" | "collect-cash",
    extra?: { code?: string; amount?: number }
  ) {
    if (!driver?.id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/driver/portal/jobs/${bookingId}/action`, {
        method: "POST",
        body: {
          driverId: driver.id,
          action,
          ...(extra?.code ? { code: extra.code } : {}),
          ...(extra?.amount != null ? { amount: extra.amount } : {}),
        },
        auth: false,
      });

      if (action === "confirm") setNotice("Trip confirmed. You are ready to start.");
      if (action === "on-the-way") setNotice("Marked on the way to customer pickup.");
      if (action === "arrived") setNotice("Marked arrived at pickup location.");
      if (action === "start") setNotice("Trip started successfully!");
      if (action === "end") setNotice("Trip completed!");
      if (action === "collect-cash") setNotice(`Recorded cash collection of ₹${extra?.amount}.`);

      setCodePromptJob(null);
      setInputCode("");
      setCashPromptJob(null);

      await loadJobs(driver.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!driver) return null;

  const activeJobs = jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled");
  const completedJobs = jobs.filter((j) => j.status === "completed" || j.status === "cancelled");
  const displayedJobs = tab === "active" ? activeJobs : completedJobs;

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-20">
        {/* Driver Profile Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                D
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{driver.name}</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                {driver.employeeCode}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Mobile: {driver.phone} • Bhubaneswar Driver Portal
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign Out
          </button>
        </div>

        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        {notice && <div className="mt-4"><Alert tone="success">{notice}</Alert></div>}

        {/* Tab Filters */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setTab("active")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ring-1 transition ${
              tab === "active"
                ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Assigned & Active Trips ({activeJobs.length})
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ring-1 transition ${
              tab === "completed"
                ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Completed History ({completedJobs.length})
          </button>
        </div>

        {/* Jobs List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading trips…</div>
          ) : displayedJobs.length === 0 ? (
            <Card>
              <div className="py-8 text-center">
                <p className="text-base font-semibold text-slate-800">
                  {tab === "active" ? "No active assignments right now" : "No completed trips yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {tab === "active"
                    ? "Dispatch will assign new bookings as they arrive. Check back soon."
                    : "Completed trips will appear here with cash collection history."}
                </p>
              </div>
            </Card>
          ) : (
            displayedJobs.map((job) => (
              <Card key={job.id}>
                {/* Trip Top Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-base font-bold text-slate-900">
                      {job.bookingNumber}
                    </span>
                    <span className="ml-2 text-xs font-medium text-slate-500">
                      • {SERVICE_LABEL[job.serviceType] ?? job.serviceType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.status} />
                    {job.cashCollected && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        Cash Collected ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Trip Info Grid */}
                <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-400">Scheduled Start</dt>
                    <dd className="font-semibold text-slate-900">{dateTime(job.scheduledStart)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Car Details</dt>
                    <dd className="font-semibold text-slate-900">
                      {job.carModel} ({job.transmission})
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-400">Pickup Location</dt>
                    <dd className="font-semibold text-slate-900">{job.pickup?.address}</dd>
                  </div>
                  {job.destination?.address && (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-400">Drop Location</dt>
                      <dd className="font-semibold text-slate-900">{job.destination.address}</dd>
                    </div>
                  )}
                  {job.instructions && (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-400">Customer Instructions</dt>
                      <dd className="rounded-md bg-slate-50 p-2 text-slate-800 italic">
                        "{job.instructions}"
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-slate-400">Customer</dt>
                    <dd className="font-semibold text-slate-900">
                      {job.customer?.name} ({job.customer?.phone})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Trip Fare (Estimate)</dt>
                    <dd className="font-semibold text-emerald-700">
                      {money(job.finalFare)}
                    </dd>
                  </div>
                </dl>

                {/* Customer Contact Action Buttons */}
                <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <a
                    href={`tel:${job.customer?.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-600/30 hover:bg-emerald-100"
                  >
                    <span>📞</span> Call Customer
                  </a>
                  <a
                    href={`https://wa.me/${String(job.customer?.phone ?? "").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    <span>💬</span> WhatsApp
                  </a>
                </div>

                {/* Step Milestone Execution Buttons */}
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {job.status === "driver_assigned" && !job.driverConfirmed && (
                    <Button
                      onClick={() => performAction(job.id, "confirm")}
                      disabled={busy}
                      className="w-full"
                    >
                      1. Confirm Assignment
                    </Button>
                  )}

                  {job.status === "driver_assigned" && job.driverConfirmed && (
                    <Button
                      onClick={() => performAction(job.id, "on-the-way")}
                      disabled={busy}
                      className="w-full bg-emerald-600 hover:bg-emerald-500"
                    >
                      2. Start Moving (On the Way)
                    </Button>
                  )}

                  {job.status === "driver_on_the_way" && !job.driverArrived && (
                    <Button
                      variant="secondary"
                      onClick={() => performAction(job.id, "arrived")}
                      disabled={busy}
                      className="w-full"
                    >
                      3. I've Arrived at Pickup
                    </Button>
                  )}

                  {job.status === "driver_on_the_way" && (
                    <Button
                      onClick={() => {
                        setCodePromptJob({ id: job.id, action: "start" });
                        setInputCode("");
                      }}
                      disabled={busy}
                      className="w-full"
                    >
                      Start Trip (Enter Customer START Code)
                    </Button>
                  )}

                  {job.status === "in_progress" && (
                    <Button
                      onClick={() => {
                        setCodePromptJob({ id: job.id, action: "end" });
                        setInputCode("");
                      }}
                      disabled={busy}
                      className="w-full bg-slate-900 hover:bg-slate-800"
                    >
                      Complete Trip (Enter Customer END Code)
                    </Button>
                  )}

                  {/* Cash Collection Feature */}
                  {job.status === "completed" && !job.cashCollected && (
                    <Button
                      onClick={() => {
                        setCashPromptJob({ id: job.id, fare: job.finalFare });
                        setCashAmount(job.finalFare);
                      }}
                      disabled={busy}
                      className="w-full bg-emerald-600 hover:bg-emerald-500"
                    >
                      💵 Record Cash Collection ({money(job.finalFare)})
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Verification Code Prompt Modal */}
        {codePromptJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">
                {codePromptJob.action === "start" ? "Enter Trip START Code" : "Enter Trip END Code"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Ask the customer for the 4-digit code shown on their booking confirmation or SMS/email.
              </p>
              <div className="mt-4">
                <Field label="4-digit Verification Code">
                  <Input
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="e.g. 1234"
                    maxLength={4}
                    inputMode="numeric"
                    autoFocus
                  />
                </Field>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCodePromptJob(null)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <Button
                  onClick={() =>
                    performAction(codePromptJob.id, codePromptJob.action, { code: inputCode })
                  }
                  disabled={busy}
                >
                  Confirm & Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cash Collection Prompt Modal */}
        {cashPromptJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">Record Cash Payment</h3>
              <p className="mt-1 text-xs text-slate-500">
                Confirm the exact cash amount handed to you by the customer.
              </p>
              <div className="mt-4">
                <Field label="Amount Collected (₹)">
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    min={0}
                    autoFocus
                  />
                </Field>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCashPromptJob(null)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <Button
                  onClick={() =>
                    performAction(cashPromptJob.id, "collect-cash", { amount: cashAmount })
                  }
                  disabled={busy || cashAmount <= 0}
                >
                  Confirm Cash Received
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
