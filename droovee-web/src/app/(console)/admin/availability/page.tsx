"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Field, Input, PageTitle, Select, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime } from "@/lib/format";

const LEAVE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
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

function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEAVE_STATUS_TONE[status] ?? "bg-slate-100 text-slate-700"}`}>
      {LEAVE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Full-day IST range for the leave form presets. */
function presetRange(offsetDays: number, lengthDays: number) {
  const nowIst = new Date(Date.now() + 330 * 60_000);
  const start = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + offsetDays, 0, 0));
  const end = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + offsetDays + lengthDays - 1, 23, 59));
  // These Dates hold IST wall-clock components in their UTC fields, which is
  // exactly the format datetime-local expects.
  return { start: start.toISOString().slice(0, 16), end: end.toISOString().slice(0, 16) };
}

export default function AvailabilityPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driverId, setDriverId] = useState("");
  const [blocks, setBlocks] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<{ bookings: any[]; blocks: any[] } | null>(null);
  const [form, setForm] = useState({ type: "leave", start: "", end: "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<any[]>([]);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
    api<{ items: any[] }>("/admin/drivers").then((r) => {
      setDrivers(r.items);
      if (r.items[0]) setDriverId(r.items[0]._id);
    }).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load drivers."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDriver(id: string) {
    if (!id) return;
    const [bl, sc] = await Promise.all([
      api<{ items: any[] }>(`/admin/availability-blocks?driverId=${id}`),
      api<{ bookings: any[]; blocks: any[] }>(`/admin/drivers/${id}/schedule`),
    ]);
    setBlocks(bl.items);
    setSchedule(sc);
  }

  async function loadPending() {
    try {
      const r = await api<{ items: any[] }>("/admin/availability-blocks?status=pending");
      setPending(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load pending leave requests.");
    }
  }

  useEffect(() => {
    loadDriver(driverId).catch(() => setError("Could not load this driver's schedule."));
    setWarnings([]);
  }, [driverId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFields({});
    const local: Record<string, string> = {};
    if (!form.start) local.start = "Choose a start date and time.";
    if (!form.end) local.end = "Choose an end date and time.";
    if (form.start && form.end && form.end <= form.start) local.end = "End must be after start.";
    setFields(local);
    if (Object.keys(local).length) return;
    try {
      const r = await api<{ warnings: any[] }>("/admin/availability-blocks", {
        method: "POST",
        body: {
          driverId,
          type: form.type,
          startAt: new Date(`${form.start}:00+05:30`).toISOString(),
          endAt: new Date(`${form.end}:00+05:30`).toISOString(),
          reason: form.reason.trim() || undefined,
        },
      });
      setWarnings(r.warnings ?? []);
      setNotice("Unavailable period saved.");
      setForm({ type: "leave", start: "", end: "", reason: "" });
      loadDriver(driverId);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not save the unavailable period.");
    }
  }

  async function removeBlock(id: string) {
    if (!window.confirm("Remove this unavailable period? Existing bookings are not changed.")) return;
    setError(null);
    setNotice(null);
    try {
      await api(`/admin/availability-blocks/${id}`, { method: "DELETE" });
      setNotice("Unavailable period removed.");
      await loadDriver(driverId);
      await loadPending();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove the unavailable period.");
    }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    let note: string | undefined;
    if (decision === "reject") {
      const input = window.prompt("Reason for rejecting this request (required):");
      if (input === null) return;
      if (input.trim().length < 3) {
        setError("Give a short reason (at least 3 characters) when rejecting a request.");
        return;
      }
      note = input.trim();
    }
    setDecisionBusy(id);
    setError(null);
    setNotice(null);
    try {
      const r = await api<{ warnings: any[] }>(`/admin/availability-blocks/${id}/decision`, {
        method: "PATCH",
        body: { decision, note },
      });
      setWarnings(r.warnings ?? []);
      setNotice(decision === "approve" ? "Leave request approved." : "Leave request rejected.");
      await Promise.all([loadPending(), loadDriver(driverId)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the leave request.");
    } finally {
      setDecisionBusy(null);
    }
  }

  function applyPreset(offsetDays: number, lengthDays: number) {
    setForm({ ...form, ...presetRange(offsetDays, lengthDays) });
  }

  return (
    <>
      <PageTitle title="Driver availability" subtitle="Record leave and unavailable periods. Bookings that overlap are flagged, not cancelled." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      {warnings.length > 0 && (
        <div className="mb-4">
          <Alert tone="warn">
            This period overlaps {warnings.length} existing booking(s): {warnings.map((w) => w.bookingNumber).join(", ")}. Reassign them from the booking page.
          </Alert>
        </div>
      )}

      {pending.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Pending driver leave requests ({pending.length})</h2>
              <p className="mt-1 text-xs text-slate-500">
                Requests submitted from the driver portal. Approving blocks new assignments for that period.
              </p>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <Table head={["Driver", "Type", "From", "To", "Reason", "Actions"]}>
              {pending.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3">
                    {p.driver ? `${p.driver.name} (${p.driver.employeeCode})` : "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{p.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{dateTime(p.startAt)}</td>
                  <td className="px-4 py-3">{dateTime(p.endAt)}</td>
                  <td className="px-4 py-3">{p.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => decide(p._id, "approve")}
                        disabled={decisionBusy === p._id}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(p._id, "reject")}
                        disabled={decisionBusy === p._id}
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Field label="Driver">
              <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.employeeCode})</option>)}
              </Select>
            </Field>
          </Card>

          <Card>
            <h2 className="font-semibold">Upcoming schedule (next 14 days)</h2>
            {!schedule ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : (
              schedule.bookings.length + schedule.blocks.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No bookings or unavailable periods.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {schedule.bookings.map((b) => (
                    <li key={b._id} className="flex justify-between rounded-lg bg-indigo-50 p-3">
                      <span>Booking {b.bookingNumber} · {b.status.replace(/_/g, " ")}</span>
                      <span className="text-slate-600">{dateTime(b.scheduledStart)} → {dateTime(b.scheduledEnd)}</span>
                    </li>
                  ))}
                  {schedule.blocks.map((b) => (
                    <li key={b._id} className="flex justify-between rounded-lg bg-amber-50 p-3">
                      <span>{b.type.replace("_", " ")}{b.status === "pending" ? " · pending" : ""}{b.reason ? ` · ${b.reason}` : ""}</span>
                      <span className="text-slate-600">{dateTime(b.startAt)} → {dateTime(b.endAt)}</span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </Card>

          {blocks.length === 0 ? <Empty title="No unavailable periods recorded for this driver" /> : (
            <Table head={["Type", "From", "To", "Status", "Reason", "Actions"]}>
              {blocks.map((b) => (
                <tr key={b._id}>
                  <td className="px-4 py-3 capitalize">{b.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{dateTime(b.startAt)}</td>
                  <td className="px-4 py-3">{dateTime(b.endAt)}</td>
                  <td className="px-4 py-3"><LeaveStatusBadge status={b.status ?? "approved"} /></td>
                  <td className="px-4 py-3">{b.reason || "—"}</td>
                  <td className="px-4 py-3">
                    {b.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => decide(b._id, "approve")}
                          disabled={decisionBusy === b._id}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(b._id, "reject")}
                          disabled={decisionBusy === b._id}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeBlock(b._id)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <Card>
          <h2 className="font-semibold">Add leave / unavailable</h2>
          <form onSubmit={create} className="mt-4 space-y-3" noValidate>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="leave">Leave</option>
                <option value="unavailable">Unavailable</option>
                <option value="shift_off">Off shift</option>
              </Select>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="!px-2 !py-1 !text-xs" onClick={() => applyPreset(0, 1)}>Today</Button>
              <Button type="button" variant="secondary" className="!px-2 !py-1 !text-xs" onClick={() => applyPreset(1, 1)}>Tomorrow</Button>
              <Button type="button" variant="secondary" className="!px-2 !py-1 !text-xs" onClick={() => applyPreset(0, 3)}>Next 3 days</Button>
            </div>
            <Field label="From (IST)" error={fields.start}><Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} invalid={!!fields.start} /></Field>
            <Field label="To (IST)" error={fields.end}><Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} invalid={!!fields.end} /></Field>
            <Field label="Reason (optional)"><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
            <Button type="submit" className="w-full" disabled={!driverId}>Save period</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
