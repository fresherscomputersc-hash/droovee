"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, PageTitle, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

/** Company profile: official details and support targets. Owner only. */
export default function BusinessPage() {
  const [form, setForm] = useState({ name: "", address: "", supportReplyTarget: "", phone: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const b: any = await api("/admin/business");
      setForm({
        name: b.name ?? "",
        address: b.address ?? "",
        supportReplyTarget: b.supportReplyTarget ?? "",
        phone: b.phone ?? "+91 94390 00000",
        email: b.email ?? "droovee.admin@gmail.com",
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
          supportReplyTarget: form.supportReplyTarget.trim() || undefined,
        },
      });
      setNotice("Business profile updated successfully.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Business Profile" subtitle="Official Droovee company details and customer support contact information." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2" noValidate>
          <Field label="Business name"><Input value={form.name} onChange={set("name")} placeholder="Droovee Technologies Private Limited" /></Field>
          <Field label="Support reply target"><Input value={form.supportReplyTarget} onChange={set("supportReplyTarget")} placeholder="e.g. Under 15 minutes" /></Field>
          <Field label="Support helpline phone"><Input value={form.phone} onChange={set("phone")} placeholder="+91 94390 00000" /></Field>
          <Field label="Support email"><Input value={form.email} onChange={set("email")} placeholder="droovee.admin@gmail.com" /></Field>
          <div className="md:col-span-2">
            <Field label="Registered office address"><Textarea rows={3} value={form.address} onChange={set("address")} placeholder="Doorstep Dispatch Hub, Patia, Bhubaneswar, Odisha 751024" /></Field>
          </div>
          <div><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Profile"}</Button></div>
        </form>
      </Card>
    </>
  );
}
