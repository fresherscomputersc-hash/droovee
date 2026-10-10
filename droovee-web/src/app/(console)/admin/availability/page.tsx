"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Field, Input, PageTitle, Select, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime } from "@/lib/format";

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

  useEffect(() => {
    api<{ items: any[] }>("/admin/drivers").then((r) => {
      setDrivers(r.items);
      if (r.items[0]) setDriverId(r.items[0]._id);
    }).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load drivers."));
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
                      <span>{b.type.replace("_", " ")}{b.reason ? ` · ${b.reason}` : ""}</span>
                      <span className="text-slate-600">{dateTime(b.startAt)} → {dateTime(b.endAt)}</span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </Card>

          {blocks.length === 0 ? <Empty title="No unavailable periods recorded for this driver" /> : (
            <Table head={["Type", "From", "To", "Reason"]}>
              {blocks.map((b) => (
                <tr key={b._id}>
                  <td className="px-4 py-3 capitalize">{b.type.replace("_", " ")}</td>
                  <td className="px-4 py-3">{dateTime(b.startAt)}</td>
                  <td className="px-4 py-3">{dateTime(b.endAt)}</td>
                  <td className="px-4 py-3">{b.reason || "—"}</td>
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
