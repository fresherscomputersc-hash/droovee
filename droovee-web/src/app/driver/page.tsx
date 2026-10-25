"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, istInputToIso, money, SERVICE_LABEL } from "@/lib/format";

interface DriverSession {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  experienceYears?: number;
  languages?: string[];
}

interface LeaveRequest {
  id: string;
  type: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decisionNote: string | null;
  createdAt: string | null;
}

type Tab = "schedule" | "history" | "leave";

const LEAVE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const LEAVE_STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-200 text-slate-700",
};

/** Full-day IST range for the leave form presets. */
function presetRange(offsetDays: number, lengthDays: number) {
  const nowIst = new Date(Date.now() + 330 * 60_000);
  const start = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + offsetDays, 0, 0));
  const end = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + offsetDays + lengthDays - 1, 23, 59));
  return { start: start.toISOString().slice(0, 16), end: end.toISOString().slice(0, 16) };
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEAVE_STATUS_TONE[status] ?? "bg-slate-100 text-slate-700"}`}>
      {LEAVE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tab, setTab] = useState<Tab>("schedule");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Trip code / cash prompts
  const [codePromptJob, setCodePromptJob] = useState<{ id: string; action: "start" | "end"; bookingNumber: string } | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [cashPromptJob, setCashPromptJob] = useState<{ id: string; fare: number; bookingNumber: string } | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashError, setCashError] = useState<string | null>(null);

  // Leave request form
  const [leaveForm, setLeaveForm] = useState({ type: "leave", start: "", end: "", reason: "" });
  const [leaveFields, setLeaveFields] = useState<Record<string, string>>({});
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveWarnings, setLeaveWarnings] = useState<Array<{ bookingNumber: string }>>([]);

  const goToLogin = useCallback(
    (expired = false) => {
      if (typeof window !== "undefined") localStorage.removeItem("droovee_driver_session");
      router.replace(expired ? "/driver/login?expired=1" : "/driver/login");
    },
    [router],
  );

  // Validate the httpOnly driver session with the API (never trust localStorage alone).
  useEffect(() => {
    let cancelled = false;
    api<{ driver: DriverSession }>("/driver/me", { auth: false })
      .then((res) => {
        if (cancelled) return;
        setDriver(res.driver);
        if (typeof window !== "undefined") {
          localStorage.setItem("droovee_driver_session", JSON.stringify(res.driver));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          goToLogin(true);
          return;
        }
        setAuthError("Could not verify your session. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [goToLogin]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ items: any[] }>("/driver/portal/jobs", { auth: false });
      setJobs(res.items);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        goToLogin(true);
        return;
      }
      setError("Could not load your trips. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [goToLogin]);

  const loadLeave = useCallback(async () => {
    try {
      const res = await api<{ items: LeaveRequest[] }>("/driver/portal/leave", { auth: false });
      setLeaveRequests(res.items);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        goToLogin(true);
        return;
      }
      setError("Could not load your leave requests. Please refresh.");
    }
  }, [goToLogin]);

  useEffect(() => {
    if (driver?.id) {
      loadJobs();
      loadLeave();
    }
  }, [driver, loadJobs, loadLeave]);

  async function handleSignOut() {
    try {
      await api("/driver/logout", { method: "POST", auth: false });
    } catch {
      // The cookie may already be gone; clearing local state is still correct.
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("droovee_driver_session");
    }
    router.replace("/driver/login?signedout=1");
  }

  async function performAction(
    bookingId: string,
    action: "confirm" | "on-the-way" | "arrived" | "start" | "end" | "collect-cash",
    extra?: { code?: string; amount?: number },
  ) {
    if (!driver?.id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/driver/portal/jobs/${bookingId}/action`, {
        method: "POST",
        body: {
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
      if (action === "end") setNotice("Trip ended. Dispatch is applying the final fare; no action needed.");
      if (action === "collect-cash") setNotice(`Recorded cash collection of ₹${extra?.amount}.`);

      setCodePromptJob(null);
      setInputCode("");
      setCashPromptJob(null);
      setCashError(null);
      await loadJobs();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        goToLogin(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Action failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLeaveWarnings([]);
    setLeaveFields({});

    const local: Record<string, string> = {};
    if (!leaveForm.start) local.start = "Choose a start date and time.";
    if (!leaveForm.end) local.end = "Choose an end date and time.";
    if (leaveForm.start && leaveForm.end && leaveForm.end <= leaveForm.start) local.end = "End must be after start.";
    if (leaveForm.reason.trim().length < 3) local.reason = "Add a short reason (at least 3 characters).";
    if (Object.keys(local).length) {
      setLeaveFields(local);
      return;
    }

    setLeaveBusy(true);
    try {
      const res = await api<{ warnings: Array<{ bookingNumber: string }> }>("/driver/portal/leave", {
        method: "POST",
        body: {
          type: leaveForm.type,
          startAt: istInputToIso(leaveForm.start),
          endAt: istInputToIso(leaveForm.end),
          reason: leaveForm.reason.trim(),
        },
        auth: false,
      });
      setLeaveWarnings(res.warnings ?? []);
      setNotice("Leave request sent to dispatch for approval.");
      setLeaveForm({ type: "leave", start: "", end: "", reason: "" });
      await loadLeave();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        goToLogin(true);
        return;
      }
      if (err instanceof ApiError) {
        setError(err.message);
        setLeaveFields(err.fieldErrors ?? {});
      } else {
        setError("Could not submit the leave request.");
      }
    } finally {
      setLeaveBusy(false);
    }
  }

  async function cancelLeave(id: string) {
    if (!window.confirm("Cancel this pending leave request?")) return;
    setLeaveBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/driver/portal/leave/${id}`, { method: "DELETE", auth: false });
      setNotice("Leave request cancelled.");
      await loadLeave();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        goToLogin(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not cancel the leave request.");
    } finally {
      setLeaveBusy(false);
    }
  }

  const activeJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status !== "completed" && j.status !== "cancelled")
        .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()),
    [jobs],
  );
  const completedJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status === "completed" || j.status === "cancelled")
        .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()),
    [jobs],
  );
  const displayedJobs = tab === "schedule" ? activeJobs : completedJobs;
  const nextJob = activeJobs.find((j) => !j.tripEnded) ?? activeJobs[0] ?? null;
  const pendingLeaveCount = leaveRequests.filter((r) => r.status === "pending").length;

  const groupedJobs = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const job of displayedJobs) {
      const key = dayLabel(job.scheduledStart);
      const list = groups.get(key) ?? [];
      list.push(job);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [displayedJobs]);

  if (authError && !driver) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md px-4 py-16">
          <Card>
            <h1 className="text-lg font-bold text-slate-900">Session check failed</h1>
            <p className="mt-2 text-sm text-slate-600">{authError}</p>
            <Button className="mt-4 w-full" onClick={() => goToLogin(false)}>
              Sign in again
            </Button>
          </Card>
        </div>
      </PublicShell>
    );
  }

  if (!driver) return null;

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
            <p className="mt-1 text-xs text-slate-500">Mobile: {driver.phone} • Bhubaneswar Driver Portal</p>
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
        {leaveWarnings.length > 0 && (
          <div className="mt-4">
            <Alert tone="warn">
              This leave overlaps {leaveWarnings.length} assigned trip(s): {leaveWarnings.map((w) => w.bookingNumber).join(", ")}. Dispatch will review before approving.
            </Alert>
          </div>
        )}

        {/* Tab Filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("schedule")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ring-1 transition ${
              tab === "schedule"
                ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Schedule ({activeJobs.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ring-1 transition ${
              tab === "history"
                ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            History ({completedJobs.length})
          </button>
          <button
            onClick={() => setTab("leave")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ring-1 transition ${
              tab === "leave"
                ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Leave {pendingLeaveCount > 0 ? `(${pendingLeaveCount} pending)` : ""}
          </button>
        </div>

        {tab === "schedule" && nextJob && (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Next trip</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {nextJob.bookingNumber} · {dateTime(nextJob.scheduledStart)}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{nextJob.pickup?.address}</p>
          </div>
        )}

        {/* Jobs List */}
        {tab !== "leave" && (
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading trips…</div>
            ) : displayedJobs.length === 0 ? (
              <Card>
                <div className="py-8 text-center">
                  <p className="text-base font-semibold text-slate-800">
                    {tab === "schedule" ? "No active assignments right now" : "No completed trips yet"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tab === "schedule"
                      ? "Dispatch will assign new bookings as they arrive. Check back soon."
                      : "Completed trips will appear here."}
                  </p>
                </div>
              </Card>
            ) : (
              groupedJobs.map(([day, dayJobs]) => (
                <div key={day} className="space-y-3">
                  <h2 className="pt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{day}</h2>
                  {dayJobs.map((job) => (
                    <Card key={job.id}>
                      {/* Trip Top Line */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="font-mono text-base font-bold text-slate-900">{job.bookingNumber}</span>
                          <span className="ml-2 text-xs font-medium text-slate-500">
                            • {SERVICE_LABEL[job.serviceType] ?? job.serviceType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={job.status} />
                          {job.cashCollected && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              Cash collected ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Trip Info Grid */}
                      <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-400">Scheduled start</dt>
                          <dd className="font-semibold text-slate-900">{dateTime(job.scheduledStart)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Car details</dt>
                          <dd className="font-semibold text-slate-900">{job.carModel} ({job.transmission})</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-slate-400">Pickup location</dt>
                          <dd className="font-semibold text-slate-900">{job.pickup?.address}</dd>
                        </div>
                        {job.destination?.address && (
                          <div className="sm:col-span-2">
                            <dt className="text-slate-400">Drop location</dt>
                            <dd className="font-semibold text-slate-900">{job.destination.address}</dd>
                          </div>
                        )}
                        {job.instructions && (
                          <div className="sm:col-span-2">
                            <dt className="text-slate-400">Customer instructions</dt>
                            <dd className="rounded-md bg-slate-50 p-2 italic text-slate-800">&quot;{job.instructions}&quot;</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-slate-400">Customer</dt>
                          <dd className="font-semibold text-slate-900">
                            {job.customer?.name} ({job.customer?.phone})
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Trip fare</dt>
                          <dd className="font-semibold text-emerald-700">{money(job.finalFare)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Payment preference</dt>
                          <dd className="font-semibold text-slate-900">
                            {job.paymentPreference === "cash_upi" ? "Cash / UPI" : job.paymentPreference === "online" ? "Online" : "Not specified"}
                          </dd>
                        </div>
                      </dl>

                      {/* Customer Contact Action Buttons */}
                      <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <a
                          href={`tel:${job.customer?.phone}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-600/30 hover:bg-emerald-100"
                        >
                          <span>📞</span> Call customer
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
                          <Button onClick={() => performAction(job.id, "confirm")} disabled={busy} className="w-full">
                            1. Confirm assignment
                          </Button>
                        )}

                        {job.status === "driver_assigned" && job.driverConfirmed && (
                          <Button
                            onClick={() => performAction(job.id, "on-the-way")}
                            disabled={busy}
                            className="w-full bg-emerald-600 hover:bg-emerald-500"
                          >
                            2. Start moving (on the way)
                          </Button>
                        )}

                        {job.status === "driver_on_the_way" && !job.driverArrived && (
                          <Button
                            variant="secondary"
                            onClick={() => performAction(job.id, "arrived")}
                            disabled={busy}
                            className="w-full"
                          >
                            3. I&apos;ve arrived at pickup
                          </Button>
                        )}

                        {job.status === "driver_on_the_way" && (
                          <Button
                            onClick={() => {
                              setCodePromptJob({ id: job.id, action: "start", bookingNumber: job.bookingNumber });
                              setInputCode("");
                            }}
                            disabled={busy}
                            className="w-full"
                          >
                            Start trip (enter customer START code)
                          </Button>
                        )}

                        {job.status === "in_progress" && !job.tripEnded && (
                          <Button
                            onClick={() => {
                              setCodePromptJob({ id: job.id, action: "end", bookingNumber: job.bookingNumber });
                              setInputCode("");
                            }}
                            disabled={busy}
                            className="w-full bg-slate-900 hover:bg-slate-800"
                          >
                            End trip (enter customer END code)
                          </Button>
                        )}

                        {job.tripEnded && job.status !== "completed" && (
                          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                            Trip ended. Dispatch is applying the final fare; no action needed.
                          </div>
                        )}

                        {/* Cash Collection Feature */}
                        {job.tripEnded && (job.status === "in_progress" || job.status === "completed") && !job.cashCollected && Number(job.finalFare) > 0 && (
                          <Button
                            onClick={() => {
                              setCashPromptJob({ id: job.id, fare: job.finalFare, bookingNumber: job.bookingNumber });
                              setCashAmount(job.finalFare);
                              setCashError(null);
                            }}
                            disabled={busy}
                            className="w-full bg-emerald-600 hover:bg-emerald-500"
                          >
                            💵 Record cash collection ({money(job.finalFare)})
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Leave / unavailable */}
        {tab === "leave" && (
          <div className="mt-6 space-y-4">
            <Card>
              <h2 className="font-semibold text-slate-900">Request leave or unavailable time</h2>
              <p className="mt-1 text-xs text-slate-500">
                Dispatch reviews every request. Approved leave blocks new assignments for that period.
              </p>
              <form onSubmit={submitLeave} className="mt-4 space-y-3" noValidate>
                <Field label="Type">
                  <Select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                    <option value="leave">Leave</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="shift_off">Off shift</option>
                  </Select>
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="!px-2 !py-1 !text-xs" onClick={() => setLeaveForm({ ...leaveForm, ...presetRange(0, 1) })}>
                    Today
                  </Button>
                  <Button type="button" variant="secondary" className="!px-2 !py-1 !text-xs" onClick={() => setLeaveForm({ ...leaveForm, ...presetRange(1, 1) })}>
                    Tomorrow
                  </Button>
                  <Button type="button" variant="secondary" className="!px-2 !py-1 !text-xs" onClick={() => setLeaveForm({ ...leaveForm, ...presetRange(0, 3) })}>
                    Next 3 days
                  </Button>
                </div>
                <Field label="From (IST)" error={leaveFields.start}>
                  <Input
                    type="datetime-local"
                    value={leaveForm.start}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start: e.target.value })}
                    invalid={!!leaveFields.start}
                  />
                </Field>
                <Field label="To (IST)" error={leaveFields.end}>
                  <Input
                    type="datetime-local"
                    value={leaveForm.end}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end: e.target.value })}
                    invalid={!!leaveFields.end}
                  />
                </Field>
                <Field label="Reason" error={leaveFields.reason} hint="Required. Dispatch uses this to review the request.">
                  <Textarea
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="e.g. Family function at home"
                    maxLength={500}
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={leaveBusy}>
                  {leaveBusy ? "Sending…" : "Send request to dispatch"}
                </Button>
              </form>
            </Card>

            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Your requests</h2>
              {leaveRequests.length === 0 ? (
                <Card>
                  <p className="py-4 text-center text-sm text-slate-500">No leave requests yet.</p>
                </Card>
              ) : (
                leaveRequests.map((r) => (
                  <Card key={r.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold capitalize text-slate-900">{r.type.replace(/_/g, " ")}</span>
                      <LeaveStatusBadge status={r.status} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-700">
                      {dateTime(r.startAt)} → {dateTime(r.endAt)}
                    </p>
                    {r.reason && <p className="mt-1 text-xs text-slate-600">{r.reason}</p>}
                    {r.decisionNote && (
                      <p className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                        Dispatch note: {r.decisionNote}
                      </p>
                    )}
                    {r.status === "pending" && (
                      <Button
                        variant="secondary"
                        className="mt-3 !px-3 !py-1.5 !text-xs"
                        onClick={() => cancelLeave(r.id)}
                        disabled={leaveBusy}
                      >
                        Cancel request
                      </Button>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Verification Code Prompt Modal */}
        {codePromptJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">
                {codePromptJob.action === "start" ? "Enter trip START code" : "Enter trip END code"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {codePromptJob.bookingNumber} · Ask the customer for the 4-digit code shown on their booking page or confirmation message.
              </p>
              <div className="mt-4">
                <Field label="4-digit verification code">
                  <Input
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="e.g. 1234"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
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
                  onClick={() => performAction(codePromptJob.id, codePromptJob.action, { code: inputCode })}
                  disabled={busy || inputCode.length !== 4}
                >
                  Confirm & submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cash Collection Prompt Modal */}
        {cashPromptJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">Record cash payment</h3>
              <p className="mt-1 text-xs text-slate-500">
                {cashPromptJob.bookingNumber} · Confirm the exact cash amount handed to you by the customer. This is recorded in the ledger and must be settled with dispatch.
              </p>
              <div className="mt-4">
                <Field label="Amount collected (₹)" error={cashError ?? undefined}>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setCashAmount(value);
                      setCashError(value > cashPromptJob.fare ? `Cash cannot exceed the trip fare of ${money(cashPromptJob.fare)}.` : null);
                    }}
                    min={1}
                    max={cashPromptJob.fare}
                    autoFocus
                    invalid={!!cashError}
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
                  onClick={() => performAction(cashPromptJob.id, "collect-cash", { amount: cashAmount })}
                  disabled={busy || !Number.isFinite(cashAmount) || cashAmount <= 0 || cashAmount > cashPromptJob.fare}
                >
                  Confirm cash received
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
