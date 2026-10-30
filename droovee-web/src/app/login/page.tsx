"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ enabled: boolean }>("/auth/otp/status", { auth: false })
      .then((r) => setOtpEnabled(r.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!otpEnabled) setMode("password");
  }, [otpEnabled]);

  function done() {
    setSession({ kind: "customer" });
    router.replace(next.startsWith("/") ? next : "/bookings");
  }

  async function sendOtp() {
    setError(null);
    setNotice(null);
    if (phone.trim().length < 10) {
      setError("Enter your mobile number first, then tap Send code.");
      return;
    }
    try {
      const r = await api<{ debugCode?: string }>("/auth/otp/request", {
        method: "POST",
        body: { phone: phone.trim(), purpose: "login" },
        auth: false,
      });
      setOtpSent(true);
      if (r.debugCode) setNotice(`Your demo code is ${r.debugCode} (dev only — WhatsApp in production).`);
      else setNotice("Code sent on WhatsApp. Enter it below.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send code.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    setFields({});
    try {
      if (mode === "password") {
        await api<{ kind: "customer" }>("/auth/customer/login", {
          method: "POST",
          body: { phone, password },
          auth: false,
        });
      } else {
        if (!otpSent) throw new ApiError(400, "VALIDATION_ERROR", "Tap Send code first, then enter the code.", { otp: "required" });
        await api<{ kind: "customer" }>("/auth/customer/login-otp", {
          method: "POST",
          body: { phone: phone.trim(), otp },
          auth: false,
        });
      }
      done();
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
        <p className="mt-1 text-sm text-slate-600">Use your mobile number and password{otpEnabled ? " — or a one-time code" : ""}.</p>
        {otpEnabled && (
          <div className="mt-4 flex gap-2">
            {(["password", "otp"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setNotice(null); }}
                className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${mode === m ? "bg-accent text-brand-ink ring-brand-ink" : "bg-white ring-slate-300"}`}
              >
                {m === "password" ? "Password" : "OTP"}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
          <Field label="Mobile number" error={fields.phone}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="98765 43210" invalid={!!fields.phone} required />
          </Field>
          {mode === "password" ? (
            <Field label="Password" error={fields.password}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" invalid={!!fields.password} required />
            </Field>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-40 flex-1">
                <Field label="One-time code *" error={fields.otp}>
                  <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} invalid={!!fields.otp} />
                </Field>
              </div>
              <Button type="button" variant="secondary" onClick={sendOtp}>{otpSent ? "Resend code" : "Send code"}</Button>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          <p className="text-right text-sm">
            <Link href="/forgot-password" className="font-medium text-brand-link hover:underline">Forgot password?</Link>
          </p>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New to Droovee?{" "}
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="font-medium text-brand-link hover:underline"
          >
            Create an account
          </Link>
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
