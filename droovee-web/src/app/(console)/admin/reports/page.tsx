"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, PageTitle, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money, SERVICE_LABEL } from "@/lib/format";

/** Monthly report: bookings, cancellations, revenue, popular services, driver usage, ratings. */
export default function ReportsPage() {
  const d = new Date();
  const [month, setMonth] = useState(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  const [rep, setRep] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(m: string) {
    setError(null);
    try {
      setRep(await api(`/admin/reports/monthly?month=${m}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the report.");
    }
  }
  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageTitle title="Monthly reports" subtitle="Bookings, cancellations, revenue, services, drivers, ratings." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form className="mb-6 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); load(month); }}>
        <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <Button type="submit" variant="secondary">Load</Button>
      </form>
      {!rep && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rep && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold">Bookings by status ({rep.month})</h2>
            <Table head={["Status", "Count"]}>
              {rep.bookingsByStatus.map((r: any) => <tr key={r._id}><td className="px-4 py-2">{r._id}</td><td className="px-4 py-2">{r.count}</td></tr>)}
            </Table>
          </Card>
          <Card>
            <h2 className="font-semibold">Revenue (ledger)</h2>
            <Table head={["Method · Status", "Trips", "Total"]}>
              {rep.revenue.map((r: any, i: number) => <tr key={i}><td className="px-4 py-2">{r._id.method} · {r._id.status}</td><td className="px-4 py-2">{r.count}</td><td className="px-4 py-2">{money(r.total)}</td></tr>)}
            </Table>
          </Card>
          <Card>
            <h2 className="font-semibold">Popular services</h2>
            <Table head={["Service", "Bookings"]}>
              {rep.popularServices.map((r: any) => <tr key={r._id}><td className="px-4 py-2">{SERVICE_LABEL[r._id] ?? r._id}</td><td className="px-4 py-2">{r.count}</td></tr>)}
            </Table>
          </Card>
          <Card>
            <h2 className="font-semibold">Driver usage</h2>
            <Table head={["Driver", "Trips"]}>
              {rep.driverUsage.map((r: any, i: number) => <tr key={i}><td className="px-4 py-2">{r.driver ? `${r.driver.name} (${r.driver.employeeCode})` : "—"}</td><td className="px-4 py-2">{r.trips}</td></tr>)}
            </Table>
          </Card>
          <Card>
            <h2 className="font-semibold">Rating trend</h2>
            <Table head={["Stars", "Count"]}>
              {rep.ratingSplit.map((r: any) => <tr key={r._id}><td className="px-4 py-2">{"⭐".repeat(r._id)}</td><td className="px-4 py-2">{r.count}</td></tr>)}
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}
