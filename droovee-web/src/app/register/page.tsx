"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirm: "", otp: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpNeeded, setOtpNeeded] = useState(true); // cleared automatically if the server has OTP off

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function sendOtp() {
    setError(null);
    setNotice(null);
    if (form.phone.trim().length < 10) {
      setError("Enter your mobile number first, then tap Send code.");
      return;
    }
    try {
      const r = await api<{ debugCode?: string }>("/auth/otp/request", {
        method: "POST",
        auth: false,
        body: { phone: form.phone.trim(), purpose: "register" },
      });
      setOtpSent(true);
      setOtpNeeded(true);
      if (r.debugCode) setNotice(`Your demo code is ${r.debugCode} (dev only — real SMS in production).`);
      else setNotice("Code sent by SMS. Enter it below.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setOtpNeeded(false); // server has OTP off — register without code
      } else setError(err instanceof ApiError ? err.message : "Could not send code.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const localErrors: Record<string, string> = {};
    if (form.password.length < 10) localErrors.password = "Use at least 10 characters.";
    if (form.password !== form.confirm) localErrors.confirm = "Passwords do not match.";
    if (otpNeeded && !/^\d{6}$/.test(form.otp)) localErrors.otp = otpSent ? "Enter the 6-digit code." : "Tap Send code first, then enter the code.";
    setFields(localErrors);
    if (Object.keys(localErrors).length) return;

    setBusy(true);
    try {
      await api("/auth/customer/register", {
        method: "POST",
        auth: false,
        body: { name: form.name, phone: form.phone, password: form.password, email: form.email || undefined, ...(otpNeeded ? { otp: form.otp } : {}) },
      });
      setSession({ kind: "customer" });
      router.replace("/book/user");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not create your account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-slate-600">Track your bookings and get the launch offer.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
            <Field label="Full name" error={fields.name}>
              <Input value={form.name} onChange={set("name")} autoComplete="name" invalid={!!fields.name} required />
            </Field>
            <Field label="Mobile number" error={fields.phone} hint="Indian mobile number. We use it to contact you about your booking.">
              <Input value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" invalid={!!fields.phone} required />
            </Field>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-40 flex-1">
                <Field label="Mobile OTP *" error={fields.otp}>
                  <Input value={form.otp} onChange={set("otp")} placeholder="6-digit code" inputMode="numeric" maxLength={6} invalid={!!fields.otp} />
                </Field>
              </div>
              <Button type="button" variant="secondary" onClick={sendOtp}>{otpSent ? "Resend code" : "Send code"}</Button>
            </div>
            <Field label="Email (optional)" error={fields.email}>
              <Input type="email" value={form.email} onChange={set("email")} autoComplete="email" invalid={!!fields.email} />
            </Field>
            <Field label="Password" error={fields.password} hint="At least 10 characters — mix letters, numbers and symbols.">
              <Input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" invalid={!!fields.password} required />
            </Field>
            <Field label="Confirm password" error={fields.confirm}>
              <Input type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" invalid={!!fields.confirm} required />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account? <Link href="/login" className="font-medium text-emerald-700 hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
