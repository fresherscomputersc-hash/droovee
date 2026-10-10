"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Card, Empty, PageTitle, Stat, StatusBadge, Table, LinkButton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, SERVICE_LABEL } from "@/lib/format";
import { getSession } from "@/lib/session";

export default function DashboardPage() {
  const [dash, setDash] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const role = getSession()?.role;

  useEffect(() => {
    api("/admin/dashboard").then(setDash).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the dashboard."));
    api<{ items: any[] }>("/admin/bookings?limit=200")
      .then((r) => setBookings(r.items))
      .catch(() => setBookings([]));
  }, []);

  const needsAssignment = (bookings ?? []).filter((b) => b.status === "confirmed" || b.status === "requested");
  const upcoming = (bookings ?? []).filter((b) => !["completed", "cancelled", "rejected", "customer_no_show"].includes(b.status)).slice(0, 8);

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Today's operations at a glance (IST)." />
      {error && <Alert>{error}</Alert>}
      {dash && (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Today's bookings" value={dash.today.bookings} hint={`${dash.today.completed} completed`} />
          <Stat label="Awaiting review" value={dash.pending.review} hint="New requests" />
          <Stat label="Need a driver" value={dash.pending.assignment} hint="Confirmed, not assigned" />
          <Stat label="Active drivers" value={dash.activeDrivers} hint={`${dash.pending.cancellationRequests} cancellation requests`} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
        <Card>
          <h2 className="font-semibold">Action needed</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex justify-between"><span>New requests to review</span><strong>{dash?.pending.review ?? "—"}</strong></li>
            <li className="flex justify-between"><span>Confirmed, awaiting driver</span><strong>{needsAssignment.filter((b) => b.status === "confirmed").length}</strong></li>
            <li className="flex justify-between"><span>Cancellation requests</span><strong>{dash?.pending.cancellationRequests ?? "—"}</strong></li>
          </ul>
          {role !== "finance" && (
            <p className="mt-4 text-xs text-slate-500">Assign drivers from a booking's page. Overlaps show a warning before you confirm.</p>
          )}
        </Card>
      </div>
    </>
  );
}

