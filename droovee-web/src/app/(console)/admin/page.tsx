"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Card, Empty, PageTitle, Stat, StatusBadge, Table, LinkButton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, SERVICE_LABEL } from "@/lib/format";
import { getSession } from "@/lib/session";

const waLink = (phone: string) => `https://wa.me/${String(phone).replace(/\D/g, "")}`;

export default function DashboardPage() {
  const [dash, setDash] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[] | null>(null);
  const [alerts, setAlerts] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const role = getSession()?.role;

  const refreshAlerts = useCallback(async () => {
    try {
      setAlerts(await api<any>("/admin/alerts"));
    } catch {
      /* alerts are best-effort */
    }
  }, []);

  useEffect(() => {
    api("/admin/dashboard").then(setDash).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the dashboard."));
    api<{ items: any[] }>("/admin/bookings?openOnly=true&limit=8")
      .then((r) => setBookings(r.items))
      .catch(() => setBookings([]));
    // Defer non-critical alerts so dashboard paints first; stagger avoids 3 simultaneous heavy fetches.
    const a = setTimeout(() => refreshAlerts(), 800);
    const t = setInterval(refreshAlerts, 30000);
    return () => { clearTimeout(a); clearInterval(t); };
  }, [refreshAlerts]);

  const upcoming = bookings ?? [];
  const urgent = alerts?.urgentNoDriver ?? [];
  const overdue = alerts?.unassignedOverdue ?? [];

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Today's operations at a glance (IST). Alerts refresh every 30s." />
      {error && <Alert>{error}</Alert>}

      {urgent.length > 0 && (
        <div className="mb-4"><Alert tone="danger">🔴 {urgent.length} job{urgent.length === 1 ? "" : "s"} starting within 2 hours with no driver: {urgent.map((b: any) => b.bookingNumber).join(", ")}</Alert></div>
      )}

      {dash && (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Today's bookings" value={dash.today.bookings} hint={`${dash.today.completed} completed`} />
          <Stat label="Awaiting review" value={dash.pending.review} hint="New requests" />
          <Stat label="Need a driver" value={dash.pending.assignment} hint="Confirmed, not assigned" />
          <Stat label="Active drivers" value={dash.activeDrivers} hint={`${dash.pending.cancellationRequests} cancellation requests`} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Open bookings</h2>
              <LinkButton href="/admin/bookings" variant="secondary">View all</LinkButton>
            </div>
            {bookings === null ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : upcoming.length === 0 ? (
              <Empty title="No open bookings" />
            ) : (
              <Table head={["Booking", "Service", "Start", "Status"]}>
                {upcoming.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><Link className="font-mono text-emerald-700 hover:underline" href={`/admin/bookings/${b.id}`}>{b.bookingNumber}</Link></td>
                    <td className="px-4 py-3">{SERVICE_LABEL[b.serviceType]}</td>
                    <td className="px-4 py-3">{dateTime(b.scheduledStart)}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-semibold">Today's schedule — who is on which job</h2>
            {!alerts ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : alerts.scheduleToday.length === 0 ? (
              <Empty title="Nothing scheduled today" />
            ) : (
              <Table head={["Booking", "Start", "Driver", "Contact"]}>
                {alerts.scheduleToday.map((b: any) => (
                  <tr key={b.bookingNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono">{b.bookingNumber}</td>
                    <td className="px-4 py-3">{dateTime(b.scheduledStart)}</td>
                    <td className="px-4 py-3">{b.driver ? `${b.driver.name}${b.driverConfirmed ? " ✓" : " (unconfirmed)"}` : <span className="text-rose-700">No driver</span>}</td>
                    <td className="px-4 py-3">
                      {b.driver && (
                        <span className="flex gap-2">
                          <a href={`tel:${b.driver.phone}`} className="text-xs text-emerald-700 underline">Call</a>
                          <a href={waLink(b.driver.phone)} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline">WhatsApp</a>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Action needed</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex justify-between"><span>New requests to review</span><strong>{dash?.pending.review ?? "—"}</strong></li>
              <li className="flex justify-between"><span>Unassigned over 10 min</span><strong className={overdue.length ? "text-amber-700" : ""}>{alerts ? overdue.length : "—"}</strong></li>
              <li className="flex justify-between"><span>Cancellation requests</span><strong>{dash?.pending.cancellationRequests ?? "—"}</strong></li>
            </ul>
            {overdue.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs">
                {overdue.slice(0, 5).map((b: any) => (
                  <li key={b.bookingNumber} className="flex justify-between gap-2">
                    <span className="font-mono">{b.bookingNumber}</span>
                    <span className="text-slate-500">{dateTime(b.scheduledStart)}</span>
                  </li>
                ))}
              </ul>
            )}
            {role !== "finance" && (
              <p className="mt-4 text-xs text-slate-500">Assign drivers from a booking's page. Overlaps show a warning before you confirm.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Low ratings (last 7 days)</h2>
            {!alerts ? (
              <p className="mt-2 text-sm text-slate-500">Loading…</p>
            ) : (alerts.lowRatings ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No low ratings. 🎉</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(alerts.lowRatings ?? []).map((r: any, i: number) => (
                  <li key={i} className="rounded-lg bg-rose-50 p-3">
                    <p className="font-medium">{"⭐".repeat(r.stars)} <span className="font-mono text-xs text-slate-500">{r.bookingNumber}</span></p>
                    {r.review && <p className="text-slate-600">“{r.review}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Driver reminders due</h2>
            {!alerts ? (
              <p className="mt-2 text-sm text-slate-500">Loading…</p>
            ) : alerts.remindersDue.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">All assigned drivers confirmed. 🎉</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {alerts.remindersDue.map((b: any) => (
                  <li key={b.bookingNumber} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-medium">{b.driver.name} <span className="font-mono text-xs text-slate-500">{b.bookingNumber}</span></p>
                    <p className="text-xs text-slate-500">{dateTime(b.scheduledStart)}</p>
                    <p className="mt-1 flex gap-3">
                      <a href={`tel:${b.driver.phone}`} className="text-xs font-medium text-emerald-700 underline">Call</a>
                      <a href={waLink(b.driver.phone)} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-700 underline">WhatsApp</a>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
