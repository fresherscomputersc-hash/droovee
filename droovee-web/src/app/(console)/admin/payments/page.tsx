"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, PageTitle, Stat, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

function istDate(d: Date) {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export default function AccountsTrackingPage() {
  const [from, setFrom] = useState(() => istDate(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => istDate(new Date()));
  const [activePreset, setActivePreset] = useState<string>("30d");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settlingDriver, setSettlingDriver] = useState<any | null>(null);
  const [settleRef, setSettleRef] = useState("");
  const [busy, setBusy] = useState(false);

  function applyPreset(preset: "today" | "yesterday" | "7d" | "30d" | "month") {
    setActivePreset(preset);
    const now = new Date();
    if (preset === "today") {
      const todayStr = istDate(now);
      setFrom(todayStr);
      setTo(todayStr);
    } else if (preset === "yesterday") {
      const yestStr = istDate(new Date(now.getTime() - 86_400_000));
      setFrom(yestStr);
      setTo(yestStr);
    } else if (preset === "7d") {
      setFrom(istDate(new Date(now.getTime() - 7 * 86_400_000)));
      setTo(istDate(now));
    } else if (preset === "month") {
      const istNow = new Date(now.getTime() + 330 * 60_000);
      const startOfMonth = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1));
      setFrom(startOfMonth.toISOString().slice(0, 10));
      setTo(istDate(now));
    } else {
      setFrom(istDate(new Date(now.getTime() - 30 * 86_400_000)));
      setTo(istDate(now));
    }
  }

  async function load() {
    setError(null);
    try {
      const q = new URLSearchParams({
        from: new Date(`${from}T00:00:00+05:30`).toISOString(),
        to: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000).toISOString(),
      });
      const res = await api<any>(`/admin/reports/bookings?${q.toString()}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load financial reports.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function handleSettleDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!settlingDriver) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api<any>(`/admin/drivers/${settlingDriver.driverId}/settle-cash`, {
        method: "POST",
        body: { reference: settleRef.trim() || `Reconciled at admin office on ${new Date().toLocaleDateString("en-IN")}` },
      });
      setNotice(`Successfully reconciled ${money(res.totalSettled)} for ${settlingDriver.driverName}.`);
      setSettlingDriver(null);
      setSettleRef("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record settlement.");
    } finally {
      setBusy(false);
    }
  }

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Droovee Financial & Accounts Report"],
      [`Period: ${from} to ${to} (IST)`],
      [],
      ["--- DRIVER CASH SETTLEMENT LEDGER ---"],
      ["Driver Name", "Employee Code", "Phone", "Cash Trips", "Cash Collected (INR)", "Settled to Admin (INR)", "Pending Balance (INR)"],
      ...(data.driverLedger ?? []).map((d: any) => [
        d.driverName,
        d.employeeCode,
        d.driverPhone,
        d.tripCount,
        d.cashCollected,
        d.cashSettled,
        d.pendingBalance,
      ]),
      [],
      ["--- SERVICE REVENUE BREAKDOWN ---"],
      ["Service Type", "Trip Count", "Revenue (INR)"],
      ...(data.byService ?? []).map((s: any) => [
        SERVICE_LABEL[s._id] ?? s._id,
        s.count,
        s.revenue,
      ]),
      [],
      ["--- SUMMARY METRICS ---"],
      ["Total Bookings", totalBookings],
      ["Total Succeeded Revenue", collectedRevenue],
      ["Cash Collected by Drivers", cashSummary.totalCollected],
      ["Cash Settled to Admin", cashSummary.totalSettled],
      ["Pending Driver Cash", cashSummary.pendingDriverCash],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `droovee-accounts-${from}-to-${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const totalBookings = data?.byStatus?.reduce((s: number, r: any) => s + r.count, 0) ?? 0;
  const collectedRevenue = data?.payments?.filter((p: any) => p._id.status === "succeeded").reduce((s: number, p: any) => s + p.amount, 0) ?? 0;
  const pendingRevenue = data?.payments?.filter((p: any) => p._id.status === "pending").reduce((s: number, p: any) => s + p.amount, 0) ?? 0;
  const refunded = data?.payments?.filter((p: any) => p._id.status === "refunded").reduce((s: number, p: any) => s + p.amount, 0) ?? 0;

  const cashSummary = data?.cashSummary ?? {
    totalCollected: 0,
    totalSettled: 0,
    pendingDriverCash: 0,
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle
          title="Accounts & Financial Tracking"
          subtitle="Track booking revenue, driver cash collections, admin handovers, and outstanding balances."
        />
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={exportCSV} disabled={!data}>
            📥 Export CSV
          </Button>
        </div>
      </div>

      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      {error && <div className="mb-4"><Alert tone="danger">{error}</Alert></div>}

      {/* Date Filter Bar */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Period:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
              { id: "30d", label: "Last 30 Days" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activePreset === p.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setActivePreset("custom");
              load();
            }}
          >
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              From:
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset("custom");
                }}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              To:
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset("custom");
                }}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
            >
              Filter
            </button>
          </form>
        </div>
      </Card>

      {/* Financial Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total Revenue (GMV)"
          value={money(collectedRevenue)}
          hint={`${totalBookings} total bookings in period`}
        />
        <Stat
          label="Cash Collected by Drivers"
          value={money(cashSummary.totalCollected)}
          hint="From customers on doorstep/completion"
        />
        <Stat
          label="Cash Settled to Admin"
          value={money(cashSummary.totalSettled)}
          hint="Handed over and verified in office"
        />
        <div className={`rounded-xl p-5 shadow-sm ring-1 ${cashSummary.pendingDriverCash > 0 ? "bg-amber-50 ring-amber-300" : "bg-white ring-slate-200"}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Pending with Drivers
          </p>
          <p className={`mt-2 text-2xl font-bold ${cashSummary.pendingDriverCash > 0 ? "text-amber-900" : "text-slate-900"}`}>
            {money(cashSummary.pendingDriverCash)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {cashSummary.pendingDriverCash > 0 ? "⚠️ Awaiting handover to admin" : "All driver cash reconciled ✓"}
          </p>
        </div>
      </div>

      {/* Driver Cash Settlement Ledger (CLIENT REQ §1.2) */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Driver Cash Settlement Ledger</h2>
            <p className="text-xs text-slate-500">
              Breakdown of cash collected per driver and outstanding handover balances.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <Table head={["Driver", "Code", "Contact", "Cash Trips", "Total Cash Collected", "Settled to Admin", "Pending Balance", "Action"]}>
            {!data ? (
              <tr><td colSpan={8} className="px-4 py-4 text-center text-sm text-slate-500">Loading ledger…</td></tr>
            ) : (data.driverLedger ?? []).length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">No driver cash transactions in this period.</td></tr>
            ) : (
              data.driverLedger.map((d: any) => (
                <tr key={String(d.driverId)} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">{d.driverName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.employeeCode}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {d.driverPhone !== "—" ? (
                      <a href={`tel:${d.driverPhone}`} className="text-emerald-700 hover:underline">
                        {d.driverPhone}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">{d.tripCount}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{money(d.cashCollected)}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{money(d.cashSettled)}</td>
                  <td className="px-4 py-3 font-bold">
                    <span className={d.pendingBalance > 0 ? "text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-xs" : "text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-xs"}>
                      {money(d.pendingBalance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.pendingBalance > 0 && d.driverId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSettlingDriver(d);
                          setSettleRef(`Handover on ${new Date().toLocaleDateString("en-IN")}`);
                        }}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        Settle Cash
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Reconciled ✓</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>

      {/* Settle Driver Cash Modal Dialog */}
      {settlingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Reconcile Driver Cash Handover</h3>
            <p className="mt-1 text-xs text-slate-600">
              Confirm that <strong>{settlingDriver.driverName}</strong> ({settlingDriver.employeeCode}) has handed over <strong>{money(settlingDriver.pendingBalance)}</strong> to Droovee Admin.
            </p>
            <form onSubmit={handleSettleDriver} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Settlement Amount (₹)
                </label>
                <input
                  type="text"
                  disabled
                  value={money(settlingDriver.pendingBalance)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reference Note / Handover Mode
                </label>
                <input
                  type="text"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  placeholder="e.g. Cash handed at Patia hub / UPI transfer"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="mt-5 flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSettlingDriver(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Reconciling…" : "Confirm Handover"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Secondary Tables: Service Breakdown & Status */}
      {data && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-semibold text-slate-900">Revenue by Service Type</h2>
            <Card className="overflow-hidden p-0">
              <Table head={["Service", "Completed Trips", "Revenue"]}>
                {data.byService.map((r: any) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{SERVICE_LABEL[r._id] ?? r._id}</td>
                    <td className="px-4 py-3">{r.count}</td>
                    <td className="px-4 py-3 font-semibold">{money(r.revenue)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-slate-900">Bookings by Status</h2>
            <Card className="overflow-hidden p-0">
              <Table head={["Status", "Count", "Estimated", "Final"]}>
                {data.byStatus.map((r: any) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium">{STATUS_LABEL[r._id] ?? r._id}</td>
                    <td className="px-4 py-3">{r.count}</td>
                    <td className="px-4 py-3 text-slate-600">{money(r.estimated)}</td>
                    <td className="px-4 py-3 font-semibold">{money(r.final)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
