"use client";
import { Fragment, useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Field, Input, PageTitle, Pager, Select, Table, Textarea } from "@/components/ui";
import { can } from "@/components/AdminShell";
import { api, ApiError } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { getSession } from "@/lib/session";

const CATEGORY: Record<string, string> = {
  booking: "Booking",
  payment: "Payment",
  refund: "Refund",
  driver: "Driver",
  vehicle_pickup: "Vehicle pickup",
  account: "Account",
  other: "Other",
};
const STATUS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_customer: "Waiting for customer",
  resolved: "Resolved",
  closed: "Closed",
};
const STATUS_TONE: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_customer: "bg-violet-100 text-violet-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-700",
};
const CHANNEL: Record<string, string> = { phone: "Phone", whatsapp: "WhatsApp", web: "Website", app: "App", other: "Other" };

type Ticket = {
  _id: string;
  ticketNumber: string;
  category: string;
  channel: string;
  status: string;
  description: string;
  customerName?: string;
  customerPhone?: string;
  bookingNumber?: string | null;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
};

const emptyForm = { category: "booking", channel: "phone", description: "", customerName: "", customerPhone: "", bookingNumber: "" };

export default function TicketsPage() {
  const canWrite = can(getSession()?.role, "tickets:write");
  const [items, setItems] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState({ status: "", category: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ status: string; resolutionNotes: string }>({ status: "", resolutionNotes: "" });

  async function load(p = page) {
    const qs = new URLSearchParams({ limit: String(LIMIT), page: String(p) });
    if (filter.status) qs.set("status", filter.status);
    if (filter.category) qs.set("category", filter.category);
    try {
      const r = await api<{ items: Ticket[]; page: number; limit: number; total: number }>(`/admin/tickets?${qs.toString()}`);
      setItems(r.items);
      setPage(r.page);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load tickets.");
    }
  }
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.status, filter.category]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFields({});
    try {
      const t = await api<Ticket>("/admin/tickets", {
        method: "POST",
        body: {
          category: form.category,
          channel: form.channel,
          description: form.description.trim(),
          customerName: form.customerName.trim() || undefined,
          customerPhone: form.customerPhone.trim() || undefined,
          bookingNumber: form.bookingNumber.trim() || undefined,
        },
      });
      setNotice(`Ticket ${t.ticketNumber} created.`);
      setForm(emptyForm);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not create the ticket.");
    }
  }

  function openTicket(t: Ticket) {
    if (openId === t._id) return setOpenId(null);
    setOpenId(t._id);
    setEdit({ status: t.status, resolutionNotes: t.resolutionNotes ?? "" });
    setError(null);
    setNotice(null);
  }

  async function save(t: Ticket) {
    setError(null);
    setNotice(null);
    try {
      await api(`/admin/tickets/${t._id}`, { method: "PATCH", body: { status: edit.status, resolutionNotes: edit.resolutionNotes.trim() } });
      setNotice(`Ticket ${t.ticketNumber} updated.`);
      setOpenId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the ticket.");
    }
  }

  return (
    <>
      <PageTitle title="Support tickets" subtitle="Log customer issues from phone and WhatsApp, then track them to resolution." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      {canWrite && (
        <Card className="mb-6">
          <h2 className="font-semibold">Log a ticket</h2>
          <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-3" noValidate>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Channel">
              <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {Object.entries(CHANNEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Related booking no. (optional)" error={fields.bookingNumber}>
              <Input value={form.bookingNumber} onChange={(e) => setForm({ ...form, bookingNumber: e.target.value.toUpperCase() })} placeholder="DRV-XXXXXXXXXX" invalid={!!fields.bookingNumber} />
            </Field>
            <Field label="Customer name (optional)">
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </Field>
            <Field label="Customer mobile (optional)" error={fields.customerPhone}>
              <Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10 digits" invalid={!!fields.customerPhone} />
            </Field>
            <div />
            <div className="md:col-span-3">
              <Field label="Description" error={fields.description}>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-3"><Button type="submit">Create ticket</Button></div>
          </form>
        </Card>
      )}

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Status">
            <Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">All open and closed</option>
              {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
              <option value="">All categories</option>
              {Object.entries(CATEGORY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {items && items.length === 0 && <Empty title="No tickets match these filters" />}
      {items && items.length > 0 && (
        <>
          <Table head={["Ticket", "Category", "Customer", "Booking", "Channel", "Opened", "Status"]}>
          {items.map((t) => (
            <Fragment key={t._id}>
              <tr onClick={() => openTicket(t)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-emerald-700">{t.ticketNumber}</td>
                <td className="px-4 py-3">{CATEGORY[t.category] ?? t.category}</td>
                <td className="px-4 py-3">{t.customerName || "—"}{t.customerPhone && <div className="text-xs text-slate-500">+91{t.customerPhone}</div>}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.bookingNumber ?? "—"}</td>
                <td className="px-4 py-3">{CHANNEL[t.channel] ?? t.channel}</td>
                <td className="px-4 py-3">{dateTime(t.createdAt)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[t.status] ?? ""}`}>{STATUS[t.status] ?? t.status}</span></td>
              </tr>
              {openId === t._id && (
                <tr>
                  <td colSpan={7} className="bg-slate-50 px-4 py-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.description}</p>
                    {canWrite ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <Field label="Status">
                          <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                            {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </Select>
                        </Field>
                        <Field label="Resolution notes">
                          <Textarea rows={2} value={edit.resolutionNotes} onChange={(e) => setEdit({ ...edit, resolutionNotes: e.target.value })} />
                        </Field>
                        <div className="md:col-span-2"><Button onClick={() => save(t)}>Save changes</Button></div>
                      </div>
                    ) : (
                      t.resolutionNotes && <p className="mt-3 text-sm"><span className="font-medium">Resolution:</span> {t.resolutionNotes}</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={(p) => load(p)} />
        </>
      )}
    </>
  );
}
