"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Field, Input, PageTitle, Select, Table } from "@/components/ui";
import { can } from "@/components/AdminShell";
import { api, ApiError } from "@/lib/api";
import { dateOnly, money, SERVICE_LABEL } from "@/lib/format";
import { getSession } from "@/lib/session";

export default function CouponsPage() {
  const canWrite = can(getSession()?.role, "coupons:write");
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ code: "", value: "99", validFrom: "", validTo: "", usageLimit: "0", service: "hourly" });

  async function load() {
    try {
      setItems((await api<{ items: any[] }>("/admin/coupons")).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load coupons.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFields({});
    try {
      await api("/admin/coupons", {
        method: "POST",
        body: {
          code: form.code.trim().toUpperCase(),
          type: "first_hour_price",
          value: Number(form.value),
          validFrom: new Date(`${form.validFrom}T00:00:00+05:30`).toISOString(),
          validTo: new Date(`${form.validTo}T23:59:59+05:30`).toISOString(),
          usageLimit: Number(form.usageLimit),
          eligibleServices: form.service ? [form.service] : [],
        },
      });
      setNotice(`Coupon ${form.code.toUpperCase()} created.`);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not create the coupon.");
    }
  }

  return (
    <>
      <PageTitle title="Coupons" subtitle="Admin-managed codes, including first-hour price offers." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      {canWrite && (
        <Card className="mb-6">
          <h2 className="font-semibold">New coupon</h2>
          <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-3" noValidate>
            <Field label="Code" error={fields.code}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH99" invalid={!!fields.code} required /></Field>
            <Field label="First-hour price (₹)" error={fields.value}><Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} invalid={!!fields.value} /></Field>
            <Field label="Applies to">
              <Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                <option value="hourly">{SERVICE_LABEL.hourly}</option>
                <option value="">All services</option>
              </Select>
            </Field>
            <Field label="Valid from" error={fields.validFrom}><Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} invalid={!!fields.validFrom} required /></Field>
            <Field label="Valid to" error={fields.validTo}><Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} invalid={!!fields.validTo} required /></Field>
            <Field label="Usage limit (0 = unlimited)"><Input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /></Field>
            <div className="md:col-span-3"><Button type="submit">Create coupon</Button></div>
          </form>
        </Card>
      )}
      {items && items.length === 0 && <Empty title="No coupons yet" />}
      {items && items.length > 0 && (
        <Table head={["Code", "First-hour price", "Valid", "Used", "Services", "Active"]}>
          {items.map((c) => (
            <tr key={c._id}>
              <td className="px-4 py-3 font-mono">{c.code}</td>
              <td className="px-4 py-3">{money(c.value)}</td>
              <td className="px-4 py-3">{dateOnly(c.validFrom)} – {dateOnly(c.validTo)}</td>
              <td className="px-4 py-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
              <td className="px-4 py-3">{c.eligibleServices?.length ? c.eligibleServices.map((s: string) => SERVICE_LABEL[s] ?? s).join(", ") : "All"}</td>
              <td className="px-4 py-3">{c.active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
