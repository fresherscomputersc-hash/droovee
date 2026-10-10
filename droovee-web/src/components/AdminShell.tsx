"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getSession, setSession, Session } from "@/lib/session";
import { api, setAccessToken } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";

// Navigation is for usability only. The API enforces permissions on every call.
const NAV: { href: string; label: string; perm?: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings", perm: "bookings:read" },
  { href: "/admin/drivers", label: "Drivers", perm: "drivers:read" },
  { href: "/admin/availability", label: "Availability", perm: "drivers:read" },
  { href: "/admin/customers", label: "Customers", perm: "customers:read" },
  { href: "/admin/payments", label: "Payments & reports", perm: "reports:read" },
  { href: "/admin/coupons", label: "Coupons", perm: "bookings:read" },
  { href: "/admin/tickets", label: "Support tickets", perm: "tickets:read" },
  { href: "/admin/pricing", label: "Pricing & settings", perm: "pricing:write" },
  { href: "/admin/staff", label: "Staff & roles", perm: "staff:manage" },
  { href: "/admin/audit", label: "Audit log", perm: "audit:read" },
];

/** Permissions come from the API at sign-in (single source of truth). Used only to show or hide controls. */
export function can(_role: string | undefined, perm: string): boolean {
  const perms = getSession()?.permissions ?? [];
  return perms.includes(perm);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setS] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = getSession();
    if (!s || s.kind !== "staff" || !s.permissions) {
      router.replace("/admin/login");
      setS(null);
    } else setS(s);
  }, [router]);

  if (session === undefined) return <div className="p-10 text-sm text-slate-500">Loading…</div>;
  if (!session) return null;

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: {}, auth: false }).catch(() => {});
    setAccessToken(null);
    setSession(null);
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-slate-900 text-slate-200 md:min-h-screen md:w-60 md:border-b-0">
        <div className="flex items-center justify-between p-4 md:block">
          <div>
            <p className="text-base font-semibold text-white">Droovee Admin</p>
            <p className="text-xs text-slate-400">{ROLE_LABEL[session.role ?? ""] ?? session.role}</p>
          </div>
          <button onClick={signOut} className="text-xs text-slate-400 hover:text-white md:mt-3">Sign out</button>
        </div>
        <nav className="flex flex-row gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:gap-0.5 md:overflow-visible md:px-3">
          {NAV.filter((n) => !n.perm || can(session.role, n.perm)).map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-8">{children}</div>
    </div>
  );
}
