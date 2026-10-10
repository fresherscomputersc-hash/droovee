"use client";
import { useEffect, useState } from "react";
import { Alert, PageTitle, Stat, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

function istDate(d: Date) {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export default function PaymentsReportsPage() {
  const [from, setFrom] = useState(() => istDate(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => istDate(new Date()));
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const q = new URLSearchParams({
        from: new Date(`${from}T00:00:00+05:30`).toISOString(),
        to: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000).toISOString(),
      });
      setData(await api(`/admin/reports/bookings?${q.toString()}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load reports.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBookings = data?.byStatus?.reduce((s: number, r: any) => s + r.count, 0) ?? 0;
  const collected = data?.payments?.filter((p: any) => p._id.status === "succeeded").reduce((s: number, p: any) => s + p.amount, 0) ?? 0;
  const pending = data?.payments?.filter((p: any) => p._id.status === "pending").reduce((s: number, p: any) => s + p.amount, 0) ?? 0;
  const refunded = data?.payments?.filter((p: any) => p._id.status === "refunded").reduce((s: number, p: any) => s + p.amount, 0) ?? 0;

  return (
    <>
      <PageTitle title="Payments & reports" subtitle="Collected payments are shown separately from pending amounts and refunds (IST)." />
      <form className="mb-6 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label className="text-sm">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5" /></label>
        <label className="text-sm">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5" /></label>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Apply</button>
      </form>
      {error && <Alert>{error}</Alert>}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Bookings in period" value={totalBookings} />
            <Stat label="Collected" value={money(collected)} hint="Succeeded payments" />
            <Stat label="Pending" value={money(pending)} hint="Not yet collected" />
            <Stat label="Refunded" value={money(refunded)} hint="Approved refunds" />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 font-semibold">By status</h2>
              <Table head={["Status", "Count", "Estimated", "Final"]}>
                {data.byStatus.map((r: any) => (
                  <tr key={r._id}><td className="px-4 py-3">{STATUS_LABEL[r._id] ?? r._id}</td><td className="px-4 py-3">{r.count}</td><td className="px-4 py-3">{money(r.estimated)}</td><td className="px-4 py-3">{money(r.final)}</td></tr>
                ))}
              </Table>
            </div>
            <div>
              <h2 className="mb-3 font-semibold">By service</h2>
              <Table head={["Service", "Count", "Revenue"]}>
                {data.byService.map((r: any) => (
                  <tr key={r._id}><td className="px-4 py-3">{SERVICE_LABEL[r._id] ?? r._id}</td><td className="px-4 py-3">{r.count}</td><td className="px-4 py-3">{money(r.revenue)}</td></tr>
                ))}
              </Table>
            </div>
          </div>
          <div className="mt-8">
            <h2 className="mb-3 font-semibold">Payments by method and status</h2>
            <Table head={["Method", "Status", "Count", "Amount"]}>
              {data.payments.length === 0 ? (
                <tr><td className="px-4 py-3 text-slate-500" colSpan={4}>No payments in this period.</td></tr>
              ) : data.payments.map((p: any, i: number) => (
                <tr key={i}><td className="px-4 py-3 uppercase">{p._id.method}</td><td className="px-4 py-3 capitalize">{p._id.status}</td><td className="px-4 py-3">{p.count}</td><td className="px-4 py-3">{money(p.amount)}</td></tr>
              ))}
            </Table>
            <p className="mt-3 text-xs text-slate-500">Online (UPI/card) payments are not connected yet; cash receipts appear here once recorded on a booking.</p>
          </div>
        </>
      )}
    </>
  );
}
