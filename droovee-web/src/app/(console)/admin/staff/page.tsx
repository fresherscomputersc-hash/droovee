"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, PageTitle, Select, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";

export default function StaffPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "operations" });

  async function load() {
    try {
      setItems((await api<{ items: any[] }>("/admin/staff")).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load staff.");
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
      await api("/admin/staff", { method: "POST", body: form });
      setNotice(`Account created for ${form.email}.`);
      setForm({ name: "", email: "", password: "", role: "operations" });
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not create the account.");
    }
  }

  async function update(id: string, body: Record<string, unknown>) {
    setError(null);
    try {
      await api(`/admin/staff/${id}`, { method: "PATCH", body });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the account.");
    }
  }

  return (
    <>
      <PageTitle title="Staff & roles" subtitle="Disabling an account blocks access on their next request." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      <Card className="mb-6">
        <h2 className="font-semibold">Add staff account</h2>
        <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-4" noValidate>
          <Field label="Name" error={fields.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!fields.name} required /></Field>
          <Field label="Work email" error={fields.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!fields.email} required /></Field>
          <Field label="Temporary password" error={fields.password} hint="At least 10 characters."><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} invalid={!!fields.password} required /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <div className="md:col-span-4"><Button type="submit">Create account</Button></div>
        </form>
      </Card>

      {items && (
        <Table head={["Name", "Email", "Role", "Status", ""]}>
          {items.map((s) => (
            <tr key={s._id}>
              <td className="px-4 py-3">{s.name}</td>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3">
                <Select value={s.role} onChange={(e) => update(s._id, { role: e.target.value })} className="!py-1 !text-xs">
                  {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </td>
              <td className="px-4 py-3">{s.active ? "Active" : "Disabled"}</td>
              <td className="px-4 py-3">
                <Button variant="secondary" className="!py-1 !text-xs" onClick={() => update(s._id, { active: !s.active })}>{s.active ? "Disable" : "Enable"}</Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
