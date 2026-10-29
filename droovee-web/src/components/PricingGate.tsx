"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { getSession, setSession } from "@/lib/session";

type Intent = "pricing" | "estimate";

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

type OpenOptions = {
  intent?: Intent;
  /** Called after a successful sign-in instead of navigating (used by /pricing). */
  onSuccess?: () => void;
};

type PricingGateContextValue = {
  isCustomer: boolean;
  /** True once the client has read the stored session (avoids opening the gate for signed-in users). */
  ready: boolean;
  openGate: (options?: OpenOptions) => void;
};

const PricingGateContext = createContext<PricingGateContextValue | null>(null);

export function usePricingGate() {
  const ctx = useContext(PricingGateContext);
  if (!ctx) throw new Error("usePricingGate must be used inside PricingGateProvider");
  return ctx;
}

/**
 * Global sign-in gate for private pricing.
 *
 * Logged-out users get an inline mobile + OTP modal over a blurred page.
 * Logged-in users go straight to /pricing (or /pricing#estimate).
 */
export function PricingGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCustomer, setIsCustomer] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<Intent>("pricing");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const successRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const sync = () => setIsCustomer(getSession()?.kind === "customer");
    sync();
    setReady(true);
    window.addEventListener("droovee:session-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("droovee:session-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const goToPricing = useCallback(
    (nextIntent: Intent) => {
      // Already on /pricing: update the hash without remounting the page.
      if (typeof window !== "undefined" && window.location.pathname === "/pricing") {
        if (nextIntent === "estimate") window.location.hash = "estimate";
        return;
      }
      router.push(nextIntent === "estimate" ? "/pricing#estimate" : "/pricing");
    },
    [router],
  );

  const openGate = useCallback(
    (options: OpenOptions = {}) => {
      const nextIntent = options.intent ?? "pricing";
      if (getSession()?.kind === "customer") {
        setIsCustomer(true);
        if (options.onSuccess) options.onSuccess();
        else goToPricing(nextIntent);
        return;
      }
      setIntent(nextIntent);
      successRef.current = options.onSuccess;
      setError(null);
      setNotice(null);
      setOtpSent(false);
      setOtp("");
      setOpen(true);
    },
    [goToPricing],
  );

  const closeGate = useCallback(() => {
    setOpen(false);
    successRef.current = undefined;
    setError(null);
    setNotice(null);
  }, []);

  // Focus management, scroll lock, Escape, and a simple Tab trap.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      modalRef.current?.querySelector<HTMLElement>("input")?.focus();
    }, 40);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeGate();
        return;
      }
      if (e.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, closeGate]);

  async function sendOtp() {
    setError(null);
    setNotice(null);
    const normalized = cleanPhone(phone);
    if (normalized.length !== 10) {
      setError("Enter a valid 10-digit mobile number first.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ debugCode?: string }>("/auth/otp/request", {
        method: "POST",
        body: { phone: normalized, purpose: "login" },
        auth: false,
      });
      setOtpSent(true);
      setNotice(r.debugCode ? `Demo code: ${r.debugCode} (dev only — WhatsApp in production).` : "Code sent on WhatsApp. Enter it below.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!otpSent) {
      setError("Tap Send code first.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/customer/login-otp", {
        method: "POST",
        body: { phone: cleanPhone(phone), otp },
        auth: false,
      });
      setSession({ kind: "customer" });
      window.dispatchEvent(new Event("droovee:session-changed"));
      setIsCustomer(true);
      setOpen(false);
      const onSuccess = successRef.current;
      successRef.current = undefined;
      if (onSuccess) onSuccess();
      else goToPricing(intent);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PricingGateContext.Provider value={{ isCustomer, ready, openGate }}>
      <style>{`
        @keyframes pg-modal-in {
          from { opacity: 0; transform: translateY(10px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pg-modal-card { animation: pg-modal-in .22s cubic-bezier(.22, 1, .36, 1); }
        @media (prefers-reduced-motion: reduce) {
          .pg-modal-card { animation: none !important; transform: none !important; opacity: 1 !important; }
        }
      `}</style>
      {children}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={closeGate} aria-hidden="true" />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-gate-title"
            className="pg-modal-card relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
          >
            <button
              type="button"
              onClick={closeGate}
              aria-label="Close sign-in"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <h2 id="pricing-gate-title" className="pr-10 text-lg font-bold text-brand-ink">
              {intent === "estimate" ? "Sign in to get an estimate" : "Sign in to see pricing"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your mobile number. We&apos;ll send a one-time code — no password needed.
            </p>

            <form onSubmit={verify} className="mt-5 space-y-4" noValidate>
              {error && <Alert>{error}</Alert>}
              {notice && <Alert tone="success">{notice}</Alert>}

              <Field label="Mobile number">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  maxLength={14}
                  required
                />
              </Field>

              {otpSent && (
                <Field label="One-time code">
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </Field>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" onClick={sendOtp} disabled={busy}>
                  {otpSent ? "Resend code" : "Send code"}
                </Button>
                {otpSent && (
                  <Button type="submit" disabled={busy}>
                    {busy ? "Verifying…" : "Verify & continue"}
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="text-slate-500">
                  New to Droovee?{" "}
                  <Link href="/register" className="font-semibold text-brand-link hover:underline">
                    Create an account
                  </Link>
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(intent === "estimate" ? "/pricing#estimate" : "/pricing")}`}
                  className="font-medium text-slate-500 hover:text-brand-link hover:underline"
                >
                  Use password instead
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </PricingGateContext.Provider>
  );
}
