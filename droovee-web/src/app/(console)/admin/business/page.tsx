"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, PageTitle, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

/** Company profile: insurance cover shown on site, support target, address. Owner only. */
export default function BusinessPage() {
  const [form, setForm] = useState({ name: "", address: "", insuranceProvider: "", insurancePolicyNumber: "", insuranceValidTill: "", insuranceCoverageNote: "", supportReplyTarget: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const b: any = await api("/admin/business");
      setForm({
        name: b.name ?? "",
        address: b.address ?? "",
        insuranceProvider: b.insuranceProvider ?? "",
        insurancePolicyNumber: b.insurancePolicyNumber ?? "",
        insuranceValidTill: b.insuranceValidTill ? String(b.insuranceValidTill).slice(0, 10) : "",
        insuranceCoverageNote: b.insuranceCoverageNote ?? "",
        supportReplyTarget: b.supportReplyTarget ?? "",
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the business profile.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api("/admin/business", {
        method: "PUT",
        body: {
          name: form.name.trim() || undefined,
          address: form.address.trim() || undefined,
          insuranceProvider: form.insuranceProvider.trim() || undefined,
          insurancePolicyNumber: form.insurancePolicyNumber.trim() || undefined,
          insuranceValidTill: form.insuranceValidTill ? new Date(`${form.insuranceValidTill}T00:00:00+05:30`).toISOString() : undefined,
          insuranceCoverageNote: form.insuranceCoverageNote.trim() || undefined,
          supportReplyTarget: form.supportReplyTarget.trim() || undefined,
        },
      });
      setNotice("Business profile saved. Insurance shows on the About page.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Business & insurance" subtitle="Shown publicly on the site. Expiry warns on the dashboard." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2" noValidate>
          <Field label="Business name"><Input value={form.name} onChange={set("name")} /></Field>
          <Field label="Address"><Input value={form.address} onChange={set("address")} /></Field>
          <Field label="Insurance provider"><Input value={form.insuranceProvider} onChange={set("insuranceProvider")} placeholder="e.g. HDFC Ergo" /></Field>
          <Field label="Policy number"><Input value={form.insurancePolicyNumber} onChange={set("insurancePolicyNumber")} /></Field>
          <Field label="Insurance valid till"><Input type="date" value={form.insuranceValidTill} onChange={set("insuranceValidTill")} /></Field>
          <Field label="Support reply target"><Input value={form.supportReplyTarget} onChange={set("supportReplyTarget")} /></Field>
          <div className="md:col-span-2">
            <Field label="Coverage note (shown on site)"><Textarea rows={2} value={form.insuranceCoverageNote} onChange={set("insuranceCoverageNote")} placeholder="What the cover includes" /></Field>
          </div>
          <div><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </Card>
    </>
  );
}
