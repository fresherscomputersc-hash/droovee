"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getSession, setSession, Session } from "@/lib/session";
import { api, setAccessToken } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { AlarmToggle, NewBookingAlarm } from "@/components/NewBookingAlarm";

// Navigation is for usability only. The API enforces permissions on every call.
const NAV: { href: string; label: string; perm?: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings", perm: "bookings:read" },
  { href: "/admin/drivers", label: "Drivers", perm: "drivers:read" },
  { href: "/admin/availability", label: "Availability", perm: "drivers:read" },
  { href: "/admin/customers", label: "Customers", perm: "customers:read" },
  { href: "/admin/payments", label: "Payments & reports", perm: "reports:read" },
  { href: "/admin/coupons", label: "Coupons", perm: "bookings:read" },
  { href: "/admin/referrals", label: "Referrals", perm: "bookings:read" },
  { href: "/admin/reports", label: "Reports", perm: "reports:read" },
  { href: "/admin/feedback", label: "Feedback", perm: "bookings:read" },
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
  const [menuOpen, setMenuOpen] = useState(false);

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
          <div className="flex items-center gap-3">
            <AlarmToggle />
            <button onClick={signOut} className="text-xs text-slate-400 hover:text-white md:mt-3">Sign out</button>
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu" className="grid h-9 w-9 place-items-center rounded-lg text-slate-200 hover:bg-slate-800 md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" /></svg>
            </button>
          </div>
        </div>
        <nav className={`${menuOpen ? "flex" : "hidden"} flex-col gap-0.5 px-3 pb-3 md:flex md:flex-col md:overflow-visible`}>
          {NAV.filter((n) => !n.perm || can(session.role, n.perm)).map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-8">{children}</div>
      <NewBookingAlarm />
    </div>
  );
}
