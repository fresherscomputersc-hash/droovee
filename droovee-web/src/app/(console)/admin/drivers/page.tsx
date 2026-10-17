"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Field, Input, PageTitle, Select, Table } from "@/components/ui";
import { can } from "@/components/AdminShell";
import { api, ApiError } from "@/lib/api";
import { dateOnly } from "@/lib/format";
import { getSession } from "@/lib/session";

const HIRING_LABELS: Record<string, string> = {
  idProof: "ID proof",
  licence: "Licence",
  policeVerification: "Police verification",
  testDrive: "Test drive",
  references: "References",
  codeOfConduct: "Code of conduct signed",
};

function hiringCount(d: any): number {
  return Object.keys(HIRING_LABELS).filter((k) => d.hiring?.[k]?.done).length;
}

export default function DriversPage() {
  const role = getSession()?.role;
  const canWrite = can(role, "drivers:write");
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeCode: "", name: "", phone: "", licenceNumber: "", licenceExpiresAt: "", zones: "", photoUrl: "", experienceYears: "", langs: [] as string[] });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [focusId, setFocusId] = useState("");
  const [topic, setTopic] = useState("");
  const [trainer, setTrainer] = useState("");
  const [uniformSize, setUniformSize] = useState("");

  function toggleLang(l: string) {
    setForm((f) => ({ ...f, langs: f.langs.includes(l) ? f.langs.filter((x) => x !== l) : [...f.langs, l] }));
  }

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
          photoUrl: form.photoUrl.trim() || undefined,
          experienceYears: form.experienceYears === "" ? undefined : Number(form.experienceYears),
          languages: form.langs,
        },
      });
      setNotice(`Driver ${form.name} added.`);
      setForm({ employeeCode: "", name: "", phone: "", licenceNumber: "", licenceExpiresAt: "", zones: "", photoUrl: "", experienceYears: "", langs: [] });
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

  async function tickHiring(id: string, item: string, done: boolean) {
    setError(null);
    try {
      await api(`/admin/drivers/${id}/hiring`, { method: "POST", body: { item, done } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the checklist.");
    }
  }

  async function addTraining(e: React.FormEvent) {
    e.preventDefault();
    if (!focusId || topic.trim().length < 2) return;
    setError(null);
    try {
      await api(`/admin/drivers/${focusId}/trainings`, { method: "POST", body: { topic: topic.trim(), trainer: trainer.trim() || undefined } });
      setTopic("");
      setTrainer("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record training.");
    }
  }

  async function setUniform(issued: boolean) {
    if (!focusId) return;
    setError(null);
    try {
      await api(`/admin/drivers/${focusId}/uniform`, { method: "POST", body: { issued, size: uniformSize.trim() || undefined } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update uniform.");
    }
  }

  const focus = items?.find((d) => d._id === focusId) ?? null;

  return (
    <>
      <PageTitle title="Drivers" subtitle="Company driver team. Driver contact details are visible to staff only." />
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
            <Field label="Photo URL (optional)"><Input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Experience (years)"><Input type="number" min={0} max={60} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} /></Field>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Languages</span>
              <div className="flex gap-3 text-sm">
                {["odia", "hindi", "english"].map((l) => (
                  <label key={l} className="flex items-center gap-1 capitalize">
                    <input type="checkbox" checked={form.langs.includes(l)} onChange={() => toggleLang(l)} className="h-4 w-4 accent-emerald-600" />{l}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-3"><Button type="submit">Add driver</Button></div>
          </form>
        </Card>
      )}

      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items && items.length === 0 && <Empty title="No drivers yet" />}
      {items && items.length > 0 && (
        <>
          <Table head={["Code", "Name", "Phone", "Exp", "Languages", "Hiring", "Licence expiry", "Zones", "Status"]}>
            {items.map((d) => (
              <tr key={d._id} className={focusId === d._id ? "bg-emerald-50" : "hover:bg-slate-50"}>
                <td className="px-4 py-3 font-mono">{d.employeeCode}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => setFocusId(focusId === d._id ? "" : d._id)} className="font-medium text-emerald-700 hover:underline">{d.name}</button></td>
                <td className="px-4 py-3">{d.phone}</td>
                <td className="px-4 py-3">{d.experienceYears != null ? `${d.experienceYears}y` : "—"}</td>
                <td className="px-4 py-3 capitalize">{(d.languages ?? []).join(", ") || "—"}</td>
                <td className="px-4 py-3">{hiringCount(d)}/6</td>
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
          {focus && canWrite && (
            <Card className="mt-6">
              <h2 className="font-semibold">Hiring, training & uniform — {focus.name}</h2>
              <div className="mt-4 grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium">Hiring checklist ({hiringCount(focus)}/6)</p>
                  <div className="mt-2 space-y-2">
                    {Object.entries(HIRING_LABELS).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!focus.hiring?.[k]?.done} onChange={(e) => tickHiring(focus._id, k, e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Training record</p>
                  {(focus.trainings ?? []).length === 0 && <p className="mt-1 text-xs text-slate-500">No trainings recorded.</p>}
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {(focus.trainings ?? []).map((t: any, i: number) => <li key={i}>✓ {t.topic}{t.trainer ? ` — ${t.trainer}` : ""}</li>)}
                  </ul>
                  <form onSubmit={addTraining} className="mt-3 space-y-2">
                    <Field label="Topic"><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Safe driving" /></Field>
                    <Field label="Trainer (optional)"><Input value={trainer} onChange={(e) => setTrainer(e.target.value)} /></Field>
                    <Button type="submit" variant="secondary">Record training</Button>
                  </form>
                </div>
                <div>
                  <p className="text-sm font-medium">Uniform</p>
                  <p className="mt-1 text-xs text-slate-500">{focus.uniform?.issued ? `Issued${focus.uniform.size ? ` (size ${focus.uniform.size})` : ""}` : "Not issued"}</p>
                  <div className="mt-3 space-y-2">
                    <Field label="Size"><Input value={uniformSize} onChange={(e) => setUniformSize(e.target.value)} placeholder="e.g. L" /></Field>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setUniform(true)}>Mark issued</Button>
                      <Button type="button" variant="secondary" onClick={() => setUniform(false)}>Take back</Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
