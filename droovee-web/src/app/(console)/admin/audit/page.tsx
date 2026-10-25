"use client";
import { useEffect, useState } from "react";
import { Alert, Empty, Field, Input, PageTitle, Pager, Select, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime } from "@/lib/format";

const ACTIONS = [
  "",
  "booking.create",
  "booking.assign",
  "booking.reassign",
  "booking.status_change",
  "booking.fare_adjust",
  "booking.contact_log",
  "booking.cancel_requested",
  "booking.driver_link",
  "payment.offline_record",
  "payment.cash_settlement",
  "driver.create",
  "driver.update",
  "driver.portal_pin_reset",
  "driver.bulk_portal_pin",
  "driver.cash_settlement",
  "driver.hiring",
  "driver.training",
  "driver.uniform",
  "availability.block_create",
  "availability.block_delete",
  "availability.request_create",
  "availability.request_decide",
  "availability.request_cancel",
  "ticket.create",
  "ticket.update",
  "coupon.create",
  "business.update",
  "settings.update",
  "staff.create",
  "staff.update",
];

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [entityId, setEntityId] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  const [error, setError] = useState<string | null>(null);

  async function load(p = 1) {
    setError(null);
    const q = new URLSearchParams({ limit: String(LIMIT), page: String(p) });
    if (action) q.set("action", action);
    if (entityId.trim()) q.set("entityId", entityId.trim());
    try {
      const r = await api<{ items: any[]; page: number; limit: number; total: number }>(`/admin/audit-logs?${q.toString()}`);
      setItems(r.items);
      setPage(r.page);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the audit log.");
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageTitle title="Audit log" subtitle="Append-only record of sensitive actions: who did what, and when. Secrets are never stored here." />
      <form className="mb-6 grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <Field label="Action">
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a || "All actions"}</option>)}
          </Select>
        </Field>
        <Field label="Record ID"><Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Booking, driver or staff id" /></Field>
        <div className="flex items-end"><button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Filter</button></div>
      </form>
      {error && <Alert>{error}</Alert>}
      {items && items.length === 0 && <Empty title="No audit entries match" />}
      {items && items.length > 0 && (
        <>
          <Table head={["When", "Actor", "Action", "Record", "Change / reason"]}>
            {items.map((a) => (
              <tr key={a._id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3">{dateTime(a.at)}</td>
                <td className="px-4 py-3">{a.actorKind}{a.actorRole ? ` · ${a.actorRole}` : ""}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.entityType} {String(a.entityId).slice(-8)}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {a.reason && <p>Reason: {a.reason}</p>}
                  {(a.before || a.after) && <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap">{JSON.stringify({ before: a.before, after: a.after })}</pre>}
                </td>
              </tr>
            ))}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={(p) => load(p)} />
        </>
      )}
    </>
  );
}
