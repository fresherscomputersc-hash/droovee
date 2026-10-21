"use client";
import { useState } from "react";
import { Card, Field, Input, Select, Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money, SERVICE_LABEL } from "@/lib/format";

const OPTIONS = [
  "hourly",
  "half_day",
  "full_day",
  "airport_pickup_drop",
  "outstation_one_way",
  "outstation_round_trip",
] as const;

/** Homepage price calculator: service + hours → live total incl. night charge. */
export function Calculator() {
  const [service, setService] = useState<string>("hourly");
  const [hours, setHours] = useState(0);
  const [days, setDays] = useState(0);
  const [nights, setNights] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function calc() {
    setError(null);
    setTotal(null);

    const fixed = service === "half_day" ? 4 : service === "full_day" ? 8 : null;

    // Friendly validation if both hours and days are 0
    if (fixed === null && hours <= 0 && days <= 0) {
      setError("Please select duration (hours or days) to calculate.");
      return;
    }

    setBusy(true);
    try {
      const duration = fixed ?? Math.max(0.5, days * 24 + hours);
      const q = new URLSearchParams({
        serviceType: service,
        durationHours: String(duration),
        startAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
        nights: String(nights),
      });
      const r = await api<{ total: number }>(`/pricing/estimate?${q.toString()}`, { auth: false });
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not calculate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Price calculator</h2>
      <p className="mt-1 text-sm text-slate-600">Pick a service and hours — see the total, including night charges.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Field label="Service">
          <Select value={service} onChange={(e) => setService(e.target.value)}>
            {OPTIONS.map((o) => (
              <option key={o} value={o}>
                {SERVICE_LABEL[o]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hours">
          {/* ✅ Changed min={1} to min={0} so you can decrease back to 0 */}
          <Input
            type="number"
            min={0}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
            disabled={service === "half_day" || service === "full_day"}
          />
        </Field>
        <Field label="Days (optional)">
          <Input
            type="number"
            min={0}
            step={1}
            value={days}
            onChange={(e) => setDays(Math.max(0, Number(e.target.value)))}
            disabled={service === "half_day" || service === "full_day"}
          />
        </Field>
        <Field label="Night halts (outstation)">
          <Input
            type="number"
            min={0}
            max={30}
            value={nights}
            onChange={(e) => setNights(Math.max(0, Number(e.target.value)))}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Button type="button" onClick={calc} disabled={busy}>
          {busy ? "Calculating…" : "Calculate"}
        </Button>
        {total != null && (
          <p className="text-2xl font-semibold">
            {money(total)} <span className="text-xs font-normal text-slate-500">estimate</span>
          </p>
        )}
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </div>
    </Card>
  );
}