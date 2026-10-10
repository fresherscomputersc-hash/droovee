"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Empty, LinkButton, PageTitle, StatusBadge, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { dateTime, money, SERVICE_LABEL } from "@/lib/format";

export default function MyBookingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.kind !== "customer") {
      router.replace("/login?next=/bookings");
      return;
    }
    api<{ items: any[] }>("/bookings/my")
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your bookings."));
  }, [router]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageTitle title="My bookings" subtitle="Status, driver details and fare for each booking." actions={<LinkButton href="/book">Book a driver</LinkButton>} />
        {error && <Alert>{error}</Alert>}
        {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {items && items.length === 0 && (
          <Empty title="No bookings yet">
            <Link href="/book" className="font-medium text-emerald-700 underline">Book your first driver</Link>
          </Empty>
        )}
        {items && items.length > 0 && (
          <Table head={["Booking", "Service", "Start (IST)", "Fare", "Status"]}>
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/bookings/${b.id}`} className="text-emerald-700 hover:underline">{b.bookingNumber}</Link>
                </td>
                <td className="px-4 py-3">{SERVICE_LABEL[b.serviceType] ?? b.serviceType}</td>
                <td className="px-4 py-3">{dateTime(b.scheduledStart)}</td>
                <td className="px-4 py-3">{money(b.finalFare ?? b.estimate?.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </PublicShell>
  );
}
