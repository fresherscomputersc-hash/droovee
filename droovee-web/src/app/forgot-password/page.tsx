"use client";
import Link from "next/link";
import { useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDebugLink(null);
    if (!email.trim() && !phone.trim()) {
      setError("Enter your email or mobile number.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ message: string; debugLink?: string }>("/auth/customer/forgot-password", {
        method: "POST",
        auth: false,
        body: { email: email.trim() || undefined, phone: phone.trim() || undefined },
      });
      setSent(true);
      if (r.debugLink) setDebugLink(r.debugLink);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <h1 className="text-xl font-semibold">Forgot password?</h1>
          <p className="mt-1 text-sm text-slate-600">We'll email you a reset link (valid 30 minutes).</p>
          {sent ? (
            <div className="mt-6 space-y-4">
              <Alert tone="success">If an account exists for these details, a reset link has been sent to its email.</Alert>
              {debugLink && (
                <Alert>
                  Dev mode (no email configured) — open this link:{" "}
                  <Link href={debugLink.replace(/^.*localhost:3000/, "")} className="underline">reset password</Link>
                </Alert>
              )}
              <p className="text-center text-sm text-slate-600">
                <Link href="/login" className="font-medium text-emerald-700 hover:underline">Back to sign in</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {error && <Alert>{error}</Alert>}
              <Field label="Email">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="you@example.com" />
              </Field>
              <Field label="Or mobile number">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="98765 43210" />
              </Field>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
            </form>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
