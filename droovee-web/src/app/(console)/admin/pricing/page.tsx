"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, PageTitle, Select, Table, Textarea, Input } from "@/components/ui";
import { can } from "@/components/AdminShell";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { money, SERVICE_LABEL } from "@/lib/format";

export default function PricingPage() {
  const canEdit = can(getSession()?.role, "pricing:write");
  const [data, setData] = useState<any | null>(null);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api("/admin/settings");
      setData(r);
      setDraft(JSON.stringify({ pricing: r.settings.pricing, policy: r.settings.policy }, null, 2));
      setPkgs(r.settings.pricing.packages ?? []);
      setGstin(r.settings.pricing.invoice?.gstin?.value ?? "");
      setGstRate(String(r.settings.pricing.invoice?.gstRate?.value ?? 18));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load settings.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    let parsed: any;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setError("The settings are not valid JSON. Fix the syntax and try again.");
      return;
    }
    await putSettings(parsed.pricing, parsed.policy);
  }

  /** Quick price edit: merges number changes into the full settings and saves. */
  const [quick, setQuick] = useState<Record<string, string>>({});
  const [quickReason, setQuickReason] = useState("");
  const [pkgs, setPkgs] = useState<any[] | null>(null);
  const [gstin, setGstin] = useState("");
  const [gstRate, setGstRate] = useState("");
  function qv(path: string, fallback: number) {
    return quick[path] ?? String(fallback);
  }
  function setQ(path: string, v: string) {
    setQuick((q) => ({ ...q, [path]: v }));
  }
  async function saveQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setError(null);
    setNotice(null);
    try {
      const pricing = JSON.parse(JSON.stringify(data.settings.pricing));
      for (const [k, v] of Object.entries(pricing.services as Record<string, any>)) {
        const base = Number(quick[`services.${k}.basePrice`] ?? v.basePrice);
        const perHour = Number(quick[`services.${k}.perHour`] ?? v.perHour);
        if (!Number.isFinite(base) || base < 0 || !Number.isFinite(perHour) || perHour < 0) {
          throw new Error(`Enter valid prices for ${SERVICE_LABEL[k] ?? k}.`);
        }
        v.basePrice = base;
        v.perHour = perHour;
        if (v.nightHalt !== undefined) {
          const nh = Number(quick[`services.${k}.nightHalt`] ?? v.nightHalt);
          if (!Number.isFinite(nh) || nh < 0) throw new Error(`Enter a valid night-halt price for ${SERVICE_LABEL[k] ?? k}.`);
          v.nightHalt = nh;
        }
      }
      for (const key of ["additionalHourRate", "lateNightSurcharge", "nightHaltRate"] as const) {
        const n = Number(quick[key] ?? pricing[key].value);
        if (!Number.isFinite(n) || n < 0) throw new Error("Enter valid extra charges.");
        pricing[key].value = n;
      }
      await putSettings(pricing, data.settings.policy, quickReason);
      setQuickReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }

  async function savePackages(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !pkgs) return;
    setError(null);
    setNotice(null);
    try {
      const pricing = JSON.parse(JSON.stringify(data.settings.pricing));
      pricing.packages = pkgs.map((p) => ({
        ...p,
        name: String(p.name).trim(),
        fixedPrice: Number(p.fixedPrice),
        active: Boolean(p.active),
      }));
      for (const p of pricing.packages) {
        if (!p.name || !Number.isFinite(p.fixedPrice) || p.fixedPrice < 0) throw new Error("Each package needs a name and a valid price.");
      }
      pricing.invoice = {
        gstin: { ...(pricing.invoice?.gstin ?? {}), value: gstin.trim() },
        gstRate: { ...(pricing.invoice?.gstRate ?? {}), value: Number(gstRate) },
      };
      if (!Number.isFinite(pricing.invoice.gstRate.value) || pricing.invoice.gstRate.value < 0) throw new Error("Enter a valid GST rate.");
      await putSettings(pricing, data.settings.policy, quickReason);
      setQuickReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }
  async function putSettings(pricing: any, policy: any, why?: string) {
    const changeReason = (why ?? reason).trim();
    if (changeReason.length < 5) {
      setError("Give a reason for the change (at least 5 characters).");
      return;
    }
    try {
      const r = await api<{ version: number }>("/admin/settings", {
        method: "PUT",
        body: { pricing, policy, changeReason, expectedVersion: data.version },
      });
      setNotice(`Saved as settings version ${r.version}. New bookings and the homepage use it immediately.`);
      setReason("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save settings.");
    }
  }

  if (!data && !error) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <>
      <PageTitle title="Pricing & settings" subtitle={data ? `Active version ${data.version || "(defaults)"}. Every value is confirmed or flagged.` : undefined} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      {data && (
        <>
          <Card className="mb-6">
            <h2 className="font-semibold">Rate card</h2>
            <p className="mt-1 text-xs text-slate-500">Poster rates, confirmed by the client.</p>
            <div className="mt-4">
              <Table head={["Service", "Base", "Included h", "Per hour", "Night halt"]}>
                {Object.entries(data.settings.pricing.services).map(([k, v]: [string, any]) => (
                  <tr key={k}>
                    <td className="px-4 py-3">{SERVICE_LABEL[k] ?? k}</td>
                    <td className="px-4 py-3">{v.monthly ? `${money(v.basePrice)} / month` : v.basePrice ? money(v.basePrice) : "—"}</td>
                    <td className="px-4 py-3">{v.includedHours || "—"}</td>
                    <td className="px-4 py-3">{v.perHour ? money(v.perHour) : "—"}</td>
                    <td className="px-4 py-3">{v.nightHalt ? money(v.nightHalt) : "—"}</td>
                  </tr>
                ))}
              </Table>
            </div>
            <p className="mt-4 text-sm">Additional hour: <strong>{money(data.settings.pricing.additionalHourRate.value)}</strong> · Late-night (10 PM–6 AM): <strong>+{money(data.settings.pricing.lateNightSurcharge.value)}</strong> · Night halt: <strong>{money(data.settings.pricing.nightHaltRate.value)}</strong></p>
          </Card>

          <Card className="mb-6 border-amber-300 ring-amber-200">
            <h2 className="font-semibold text-amber-900">Still unconfirmed</h2>
            <p className="mt-1 text-sm text-slate-600">These are placeholders. Production will not start until each one is confirmed.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {data.unconfirmed.map((u: string) => <li key={u} className="font-mono text-xs">{u}</li>)}
            </ul>
          </Card>

          {canEdit ? (
            <>
              <Card className="mb-6">
                <h2 className="font-semibold">Change prices</h2>
                <p className="mt-1 text-xs text-slate-500">Edit any price and save. Homepage, calculator and new bookings update immediately.</p>
                <form onSubmit={saveQuick} className="mt-4 space-y-4" noValidate>
                  <Table head={["Service", "Base price (₹)", "Per hour (₹)", "Night halt (₹)"]}>
                    {Object.entries(data.settings.pricing.services).map(([k, v]: [string, any]) => (
                      <tr key={k}>
                        <td className="px-4 py-3 text-sm">{SERVICE_LABEL[k] ?? k}</td>
                        <td className="px-4 py-3"><Input type="number" min={0} value={qv(`services.${k}.basePrice`, v.basePrice)} onChange={(e) => setQ(`services.${k}.basePrice`, e.target.value)} /></td>
                        <td className="px-4 py-3"><Input type="number" min={0} value={qv(`services.${k}.perHour`, v.perHour)} onChange={(e) => setQ(`services.${k}.perHour`, e.target.value)} /></td>
                        <td className="px-4 py-3">{v.nightHalt !== undefined ? <Input type="number" min={0} value={qv(`services.${k}.nightHalt`, v.nightHalt)} onChange={(e) => setQ(`services.${k}.nightHalt`, e.target.value)} /> : <span className="text-slate-400">—</span>}</td>
                      </tr>
                    ))}
                  </Table>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Additional hour (₹)">
                      <Input type="number" min={0} value={qv("additionalHourRate", data.settings.pricing.additionalHourRate.value)} onChange={(e) => setQ("additionalHourRate", e.target.value)} />
                    </Field>
                    <Field label="Late-night surcharge (₹)">
                      <Input type="number" min={0} value={qv("lateNightSurcharge", data.settings.pricing.lateNightSurcharge.value)} onChange={(e) => setQ("lateNightSurcharge", e.target.value)} />
                    </Field>
                    <Field label="Night-halt rate (₹)">
                      <Input type="number" min={0} value={qv("nightHaltRate", data.settings.pricing.nightHaltRate.value)} onChange={(e) => setQ("nightHaltRate", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Reason for change" hint="Required. Recorded in the audit log.">
                    <Input value={quickReason} onChange={(e) => setQuickReason(e.target.value)} />
                  </Field>
                  <Button type="submit" disabled={quickReason.trim().length < 5}>Save prices</Button>
                </form>
              </Card>
              <Card className="mb-6">
                <h2 className="font-semibold">Packages & invoice</h2>
                <p className="mt-1 text-xs text-slate-500">Fixed-price packages on the website, plus GSTIN for receipts.</p>
                <form onSubmit={savePackages} className="mt-4 space-y-4" noValidate>
                  {(pkgs ?? []).map((p, i) => (
                    <div key={p.id} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-4">
                      <Field label="Name">
                        <Input value={p.name} onChange={(e) => setPkgs((ps) => (ps ?? []).map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                      </Field>
                      <Field label="Fixed price (₹)">
                        <Input type="number" min={0} value={p.fixedPrice} onChange={(e) => setPkgs((ps) => (ps ?? []).map((x, j) => j === i ? { ...x, fixedPrice: e.target.value } : x))} />
                      </Field>
                      <Field label="Shown on site">
                        <Select value={p.active ? "yes" : "no"} onChange={(e) => setPkgs((ps) => (ps ?? []).map((x, j) => j === i ? { ...x, active: e.target.value === "yes" } : x))}>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </Select>
                      </Field>
                      <Field label="Books as">
                        <Input value={`${SERVICE_LABEL[p.serviceType] ?? p.serviceType} · ${p.durationHours}h`} disabled readOnly />
                      </Field>
                    </div>
                  ))}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Business GSTIN (for invoices)">
                      <Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="e.g. 21ABCDE1234F1Z5" />
                    </Field>
                    <Field label="GST rate (%)">
                      <Input type="number" min={0} max={100} value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
                    </Field>
                  </div>
                  <Button type="submit" disabled={quickReason.trim().length < 5}>Save packages & invoice</Button>
                </form>
              </Card>
              <Card>
                <h2 className="font-semibold">Edit settings (advanced JSON)</h2>
              <p className="mt-1 text-xs text-slate-500">Saving creates a new version. Previous versions are kept for audit.</p>
              <form onSubmit={save} className="mt-4 space-y-4" noValidate>
                <Field label="Settings (JSON)">
                  <Textarea rows={18} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-xs" />
                </Field>
                <Field label="Reason for change" hint="Required. Recorded in the audit log.">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <Button type="submit" disabled={reason.trim().length < 5}>Save new version</Button>
              </form>
              </Card>
            </>
          ) : (
            <p className="text-sm text-slate-600">Only the owner can change pricing and settings.</p>
          )}
        </>
      )}
    </>
  );
}
