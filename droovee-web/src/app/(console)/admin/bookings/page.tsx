"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Empty, Field, Input, PageTitle, Pager, Select, StatusBadge, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

const STATUSES = Object.keys(STATUS_LABEL);

export default function AdminBookingsPage() {
  const [status, setStatus] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  const [error, setError] = useState<string | null>(null);

  async function search(p = 1) {
    setError(null);
    const q = new URLSearchParams({ limit: String(LIMIT), page: String(p) });
    if (status) q.set("status", status);
    if (bookingNumber.trim()) q.set("bookingNumber", bookingNumber.trim());
    if (phone.trim()) q.set("customerPhone", phone.trim());
    if (from) q.set("from", new Date(`${from}T00:00:00+05:30`).toISOString());
    if (to) q.set("to", new Date(`${to}T23:59:59+05:30`).toISOString());
    try {
      const r = await api<{ items: any[]; page: number; limit: number; total: number }>(`/admin/bookings?${q.toString()}`);
      setItems(r.items);
      setPage(r.page);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load bookings.");
    }
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageTitle title="Bookings" subtitle="Search, filter and open any booking to assign a driver or update its status." />
      <form
        className="mb-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
        </Field>
        <Field label="Booking no.">
          <Input value={bookingNumber} onChange={(e) => setBookingNumber(e.target.value.toUpperCase())} placeholder="DRV-XXXXXXXX" />
        </Field>
        <Field label="Customer phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
        </Field>
        <Field label="From (IST)">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To (IST)">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Search</button>
        </div>
      </form>

      {error && <Alert>{error}</Alert>}
      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items && items.length === 0 && <Empty title="No bookings match these filters" />}
      {items && items.length > 0 && (
        <>
          <Table head={["Booking", "Customer", "Service", "Start", "Driver", "Fare", "Status"]}>
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/bookings/${b.id}`} className="font-mono text-emerald-700 hover:underline">{b.bookingNumber}</Link></td>
                <td className="px-4 py-3">{b.customer?.name}<div className="text-xs text-slate-500">{b.customer?.phone}</div></td>
                <td className="px-4 py-3">{SERVICE_LABEL[b.serviceType]}</td>
                <td className="px-4 py-3">{dateTime(b.scheduledStart)}</td>
                <td className="px-4 py-3">{b.driverId ? "Assigned" : <span className="text-slate-500">—</span>}</td>
                <td className="px-4 py-3">{money(b.finalFare ?? b.fareEstimate?.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={(p) => search(p)} />
        </>
      )}
    </>
  );
}
