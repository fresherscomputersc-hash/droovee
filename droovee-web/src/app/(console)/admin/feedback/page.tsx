"use client";
import { useEffect, useState } from "react";
import { Alert, Card, Empty, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime } from "@/lib/format";

/** Weekly feedback review: all reviews, cancellation reasons, open support issues. */
export default function FeedbackPage() {
  const [ratings, setRatings] = useState<any[] | null>(null);
  const [cancels, setCancels] = useState<any[] | null>(null);
  const [tickets, setTickets] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: any[] }>("/admin/ratings").then((r) => setRatings(r.items)).catch(() => setRatings([]));
    api<{ items: any[] }>("/admin/bookings?limit=100").then((r) => setCancels(
      r.items.filter((b: any) => b.cancellation?.requestedAt || ["cancelled", "rejected", "customer_no_show"].includes(b.status)),
    )).catch(() => setCancels([]));
    api<{ items: any[] }>("/admin/tickets?status=open&limit=100").catch(() => ({ items: [] })).then((r) => setTickets(r.items)).catch(() => setTickets([]));
  }, []);

  return (
    <>
      <PageTitle title="Feedback review" subtitle="Weekly: ratings, cancellations, open complaints — and what to fix." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Ratings & reviews</h2>
          {!ratings ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : ratings.length === 0 ? <p className="mt-2 text-sm text-slate-600">No ratings yet.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {ratings.slice(0, 20).map((r: any) => (
                <li key={r._id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium">{"⭐".repeat(r.stars)} <span className="font-mono text-xs text-slate-500">{r.bookingId?.bookingNumber} · {r.bookingId?.serviceType}</span></p>
                  {r.review && <p className="text-slate-600">“{r.review}”</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Cancellations</h2>
          {!cancels ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : cancels.length === 0 ? <p className="mt-2 text-sm text-slate-600">None.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {cancels.slice(0, 20).map((b: any) => (
                <li key={b.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium"><span className="font-mono text-xs">{b.bookingNumber}</span> · {b.status}</p>
                  {(b.cancellation?.requestReason || b.cancellation?.reason) && <p className="text-slate-600">“{b.cancellation.requestReason ?? b.cancellation.reason}”</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Open support issues</h2>
          {!tickets ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : tickets.length === 0 ? <Empty title="No open issues 🎉" /> : (
            <ul className="mt-3 space-y-2 text-sm">
              {tickets.slice(0, 20).map((t: any) => (
                <li key={t._id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium"><span className="font-mono text-xs">{t.ticketNumber}</span> · {t.category}</p>
                  <p className="text-slate-600">{String(t.description).slice(0, 120)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
