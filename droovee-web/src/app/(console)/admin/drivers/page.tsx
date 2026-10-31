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
  const [bulkPins, setBulkPins] = useState<Array<{ driverId: string; employeeCode: string; name: string; pin: string }> | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [singlePin, setSinglePin] = useState<{ driverId: string; name: string; pin: string } | null>(null);
  const [pinCopied, setPinCopied] = useState(false);

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

  async function resetPin(id: string, name: string) {
    setError(null);
    setPinCopied(false);
    try {
      const r = await api<{ pin: string }>(`/admin/drivers/${id}/portal-pin`, { method: "POST", body: {} });
      setSinglePin({ driverId: id, name, pin: r.pin });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate a portal PIN.");
    }
  }

  async function generateMissingPins() {
    setError(null);
    setNotice(null);
    setBulkBusy(true);
    try {
      const r = await api<{ items: Array<{ driverId: string; employeeCode: string; name: string; pin: string }>; count: number }>(
        "/admin/drivers/bulk-portal-pin",
        { method: "POST", body: {} },
      );
      setBulkPins(r.items);
      setNotice(`${r.count} portal PIN${r.count === 1 ? "" : "s"} generated. Share each PIN privately — they are shown once.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate portal PINs.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function copyBulkPins() {
    if (!bulkPins) return;
    const text = bulkPins.map((p) => `${p.name} (${p.employeeCode}): ${p.pin}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Portal PINs copied to the clipboard.");
    } catch {
      setError("Could not access the clipboard. Copy the PINs from the table.");
    }
  }

  const missingPinCount = items?.filter((d) => d.employmentStatus === "active" && !d.portalPinSetAt).length ?? 0;

  const focus = items?.find((d) => d._id === focusId) ?? null;

  return (
    <>
      <PageTitle title="Drivers" subtitle="Company driver team. Driver contact details are visible to staff only." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      {canWrite && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Driver portal onboarding</h2>
            <p className="mt-1 text-sm text-slate-600">
              {items === null
                ? "Loading driver PIN status…"
                : missingPinCount > 0
                  ? `${missingPinCount} active driver${missingPinCount === 1 ? "" : "s"} still need a portal PIN.`
                  : "Every active driver has a portal PIN."}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={generateMissingPins} disabled={bulkBusy || items === null || missingPinCount === 0}>
            {bulkBusy ? "Generating…" : "Generate missing PINs"}
          </Button>
        </Card>
      )}

      {bulkPins && bulkPins.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">New portal PINs (shown once)</h2>
              <p className="mt-1 text-sm text-slate-600">Store these securely and share each PIN privately with the driver.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={copyBulkPins}>Copy all</Button>
              <Button type="button" variant="secondary" onClick={() => setBulkPins(null)}>Close</Button>
            </div>
          </div>
          <div className="mt-4">
            <Table head={["Driver", "Code", "PIN"]}>
              {bulkPins.map((p) => (
                <tr key={p.driverId}>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.employeeCode}</td>
                  <td className="px-4 py-3 font-mono text-lg tracking-widest">{p.pin}</td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}

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
          <Table head={["Code", "Name", "Phone", "Exp", "Languages", "Hiring", "Licence expiry", "Zones", "Portal PIN", "Status"]}>
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
                {d.portalPinSetAt ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Set</span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Not set</span>
                )}
              </td>
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
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium">Driver portal access</p>
                <p className="mt-1 text-xs text-slate-500">
                  Generates a new 6-digit PIN for {focus.name}. The PIN is shown once — share it privately with the driver.
                  Resetting also signs out any device currently using the old PIN.
                </p>

                {singlePin && singlePin.driverId === focus._id && (
                  <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                          Portal PIN for {singlePin.name}
                        </p>
                        <div className="mt-1 flex items-baseline gap-3">
                          <span className="font-mono text-3xl font-extrabold tracking-widest text-emerald-950">
                            {singlePin.pin}
                          </span>
                          <span className="text-xs text-emerald-700">
                            (Shown once — share privately)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 text-xs font-semibold"
                          onClick={() => {
                            navigator.clipboard?.writeText(singlePin.pin);
                            setPinCopied(true);
                            setTimeout(() => setPinCopied(false), 2000);
                          }}
                        >
                          {pinCopied ? "✓ Copied" : "Copy PIN"}
                        </Button>
                        <button
                          type="button"
                          aria-label="Dismiss PIN"
                          className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => setSinglePin(null)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="button" variant="secondary" className="mt-3" onClick={() => resetPin(focus._id, focus.name)}>
                  Generate new portal PIN
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
