"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Field, Input, PageTitle, Select, Table } from "@/components/ui";
import { can } from "@/components/AdminShell";
import { api, ApiError } from "@/lib/api";
import { dateOnly } from "@/lib/format";
import { getSession } from "@/lib/session";

export default function DriversPage() {
  const role = getSession()?.role;
  const canWrite = can(role, "drivers:write");
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeCode: "", name: "", phone: "", licenceNumber: "", licenceExpiresAt: "", zones: "" });
  const [fields, setFields] = useState<Record<string, string>>({});

  async function load() {
    try {
      const r = await api<{ items: any[] }>("/admin/drivers");
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load drivers.");
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
      await api("/admin/drivers", {
        method: "POST",
        body: {
          employeeCode: form.employeeCode.trim(),
          name: form.name.trim(),
          phone: form.phone.trim(),
          licenceNumber: form.licenceNumber.trim() || undefined,
          licenceExpiresAt: form.licenceExpiresAt ? new Date(`${form.licenceExpiresAt}T00:00:00+05:30`).toISOString() : undefined,
          serviceZones: form.zones.split(",").map((z) => z.trim()).filter(Boolean),
        },
      });
      setNotice(`Driver ${form.name} added.`);
      setForm({ employeeCode: "", name: "", phone: "", licenceNumber: "", licenceExpiresAt: "", zones: "" });
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not add the driver.");
    }
  }

  async function setStatus(id: string, employmentStatus: string) {
    setError(null);
    try {
      await api(`/admin/drivers/${id}`, { method: "PATCH", body: { employmentStatus } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the driver.");
    }
  }

  return (
    <>
      <PageTitle title="Drivers" subtitle="Salaried employee drivers. Driver contact details are visible to staff only." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      {canWrite && (
        <Card className="mb-6">
          <h2 className="font-semibold">Add driver</h2>
          <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-3" noValidate>
            <Field label="Employee code" error={fields.employeeCode}><Input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} invalid={!!fields.employeeCode} required /></Field>
            <Field label="Full name" error={fields.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!fields.name} required /></Field>
            <Field label="Phone" error={fields.phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} invalid={!!fields.phone} required /></Field>
            <Field label="Licence number"><Input value={form.licenceNumber} onChange={(e) => setForm({ ...form, licenceNumber: e.target.value })} /></Field>
            <Field label="Licence expiry"><Input type="date" value={form.licenceExpiresAt} onChange={(e) => setForm({ ...form, licenceExpiresAt: e.target.value })} /></Field>
            <Field label="Service zones (comma-separated)"><Input value={form.zones} onChange={(e) => setForm({ ...form, zones: e.target.value })} /></Field>
            <div className="md:col-span-3"><Button type="submit">Add driver</Button></div>
          </form>
        </Card>
      )}

      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items && items.length === 0 && <Empty title="No drivers yet" />}
      {items && items.length > 0 && (
        <Table head={["Code", "Name", "Phone", "Licence expiry", "Zones", "Status"]}>
          {items.map((d) => (
            <tr key={d._id}>
              <td className="px-4 py-3 font-mono">{d.employeeCode}</td>
              <td className="px-4 py-3">{d.name}</td>
              <td className="px-4 py-3">{d.phone}</td>
              <td className="px-4 py-3">{dateOnly(d.licenceExpiresAt)}</td>
              <td className="px-4 py-3">{(d.serviceZones ?? []).join(", ") || "—"}</td>
              <td className="px-4 py-3">
                {canWrite ? (
                  <Select value={d.employmentStatus} onChange={(e) => setStatus(d._id, e.target.value)} className="!py-1 !text-xs">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                ) : (
                  <span className="capitalize">{d.employmentStatus}</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
