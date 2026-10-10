"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, PageTitle, Table, Textarea, Input } from "@/components/ui";
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
    try {
      const r = await api<{ version: number }>("/admin/settings", {
        method: "PUT",
        body: { pricing: parsed.pricing, policy: parsed.policy, changeReason: reason.trim(), expectedVersion: data.version },
      });
      setNotice(`Saved as settings version ${r.version}. New bookings use it immediately.`);
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
            <Card>
              <h2 className="font-semibold">Edit settings</h2>
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
          ) : (
            <p className="text-sm text-slate-600">Only the owner can change pricing and settings.</p>
          )}
        </>
      )}
    </>
  );
}
