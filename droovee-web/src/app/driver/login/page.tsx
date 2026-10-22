"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function DriverLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError("Please enter your registered mobile number or Employee Code.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ driver: { id: string; employeeCode: string; name: string; phone: string } }>(
        "/driver/login",
        {
          method: "POST",
          body: { identifier: identifier.trim() },
          auth: false,
        }
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("droovee_driver_session", JSON.stringify(res.driver));
      }
      router.replace("/driver");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "No driver found with this phone number or employee code."
          : "Could not log in. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              D
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Driver Portal
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Driver Sign In</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter your mobile number or Droovee Employee Code to view your assigned trips.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && <Alert>{error}</Alert>}
            <Field label="Mobile Number or Employee Code *" hint="e.g. 9876543210 or DRV-001">
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter phone or code"
                required
              />
            </Field>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Access My Trips →"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            For operational assistance, contact dispatch at Bhubaneswar operations.
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
