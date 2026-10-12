"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const [token] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/customer/reset-password", { method: "POST", auth: false, body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <Alert>This reset link is incomplete. Request a new one.</Alert>
          <p className="mt-4 text-center text-sm"><Link href="/forgot-password" className="font-medium text-emerald-700 hover:underline">Request a new link</Link></p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <h1 className="text-xl font-semibold">Set a new password</h1>
        {done ? (
          <div className="mt-6 space-y-4">
            <Alert tone="success">Password updated. Please sign in with your new password.</Alert>
            <p className="text-center text-sm"><Link href="/login" className="font-medium text-emerald-700 hover:underline">Sign in</Link></p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && <Alert>{error}</Alert>}
            <Field label="New password" hint="At least 10 characters.">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </Field>
            <Field label="Confirm password">
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <PublicShell>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </PublicShell>
  );
}
