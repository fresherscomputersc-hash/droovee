"use client";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getSession, setSession, Session } from "@/lib/session";
import { api, setAccessToken } from "@/lib/api";

export function PublicShell({ children }: { children: ReactNode }) {
  const [session, setS] = useState<Session | null>(null);
  useEffect(() => setS(getSession()), []);

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: {}, auth: false }).catch(() => {});
    setAccessToken(null);
    setSession(null);
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">D</span>
            Droovee
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/#services" className="text-slate-600 hover:text-slate-900">Services</Link>
            <Link href="/#pricing" className="text-slate-600 hover:text-slate-900">Pricing</Link>
            {session?.kind === "customer" ? (
              <>
                <Link href="/bookings" className="text-slate-600 hover:text-slate-900">My bookings</Link>
                <Link href="/book" className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">Book a driver</Link>
                <button onClick={signOut} className="text-slate-600 hover:text-slate-900">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
                <Link href="/register" className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-6 text-sm text-slate-600">
          <p>© Droovee · Bhubaneswar, Odisha · Open 24×7</p>
          <p>
            Staff? <Link href="/admin/login" className="underline">Admin sign-in</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
