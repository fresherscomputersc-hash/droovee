"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Same-origin paths only: reject protocol-relative (//evil) and backslash
  // escapes — open redirect otherwise.
  const rawNext = params.get("next") || "/bookings";
  const next = /^\/[^/\\]/.test(rawNext) ? rawNext : "/bookings";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const r = await api<{ kind: "customer" }>("/auth/customer/login", {
        method: "POST",
        body: { phone, password },
        auth: false,
      });
      setSession({ kind: "customer" });
      router.replace(next.startsWith("/") ? next : "/bookings");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Use your mobile number and password.</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field label="Mobile number" error={fields.phone}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="98765 43210" invalid={!!fields.phone} required />
          </Field>
          <Field label="Password" error={fields.password}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" invalid={!!fields.password} required />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New to Droovee? <Link href="/register" className="font-medium text-emerald-700 hover:underline">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PublicShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PublicShell>
  );
}
