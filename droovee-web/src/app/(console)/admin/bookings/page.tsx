"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Empty, Field, Input, PageTitle, Pager, Select, StatusBadge, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

const STATUSES = Object.keys(STATUS_LABEL);
const SERVICES = Object.keys(SERVICE_LABEL);

type SearchOverrides = { status?: string; assigned?: string };

export default function AdminBookingsPage() {
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [assigned, setAssigned] = useState("");
  const [query, setQuery] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  const [error, setError] = useState<string | null>(null);

  async function search(p = 1, overrides: SearchOverrides = {}) {
    setError(null);
    const st = overrides.status ?? status;
    const asg = overrides.assigned ?? assigned;
    const qs = new URLSearchParams({ limit: String(LIMIT), page: String(p) });
    if (st) qs.set("status", st);
    if (service) qs.set("serviceType", service);
    if (asg) qs.set("assigned", asg);
    if (query.trim()) qs.set("q", query.trim());
    if (bookingNumber.trim()) qs.set("bookingNumber", bookingNumber.trim());
    if (phone.trim()) qs.set("customerPhone", phone.trim());
    if (from) qs.set("from", new Date(`${from}T00:00:00+05:30`).toISOString());
    if (to) qs.set("to", new Date(`${to}T23:59:59+05:30`).toISOString());
    try {
      const r = await api<{ items: any[]; page: number; limit: number; total: number }>(`/admin/bookings?${qs.toString()}`);
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PageTitle title="Bookings" subtitle="Dispatch queue: find a trip, assign a driver, and keep contact and fare changes on record." />
        <Link href="/admin/bookings/new" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">+ Create booking</Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "requested", "confirmed", "driver_assigned", "in_progress", "completed", "cancelled"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => { setStatus(s); search(1, { status: s }); }}
            className={`rounded-full px-3 py-1 text-xs ring-1 ${status === s ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-slate-300"}`}
          >
            {s === "" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setAssigned("false"); search(1, { assigned: "false" }); }}
          className={`rounded-full px-3 py-1 text-xs ring-1 ${assigned === "false" ? "bg-amber-500 text-white ring-amber-500" : "bg-white ring-slate-300"}`}
          title="Bookings that still need a driver"
        >
          Waiting for driver
        </button>
      </div>
      <form
        className="mb-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-3 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div className="lg:col-span-2">
          <Field label="Search">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Booking no., customer, phone or driver" />
          </Field>
        </div>
        <Field label="Service">
          <Select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">All services</option>
            {SERVICES.map((s) => <option key={s} value={s}>{SERVICE_LABEL[s]}</option>)}
          </Select>
        </Field>
        <Field label="Assignment">
          <Select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
            <option value="">All bookings</option>
            <option value="false">Waiting for driver</option>
            <option value="true">Driver assigned</option>
          </Select>
        </Field>
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="From (IST)">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To (IST)">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-end lg:col-span-4">
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Search</button>
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
                <td className="px-4 py-3">
                  {b.driver ? (
                    <span>{b.driver.name}<div className="text-xs text-slate-500">{b.driver.employeeCode}</div></span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Unassigned</span>
                  )}
                </td>
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
