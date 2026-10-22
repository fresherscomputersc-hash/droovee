"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money, SERVICE_LABEL } from "@/lib/format";

const FALLBACK_ORDER = ["hourly", "half_day", "full_day", "monthly_office", "outstation_one_way", "outstation_round_trip", "airport_pickup_drop"];
const FALLBACK_PRICES: Record<string, string> = {
  hourly: "₹149",
  half_day: "₹599",
  full_day: "₹1,099",
  monthly_office: "₹6,999",
  outstation_one_way: "₹199/h",
  outstation_round_trip: "₹169/h",
  airport_pickup_drop: "₹199/h",
};
const FALLBACK_NOTES: Record<string, string> = {
  hourly: "for 1st hour · extra hours at ₹129/hour",
  half_day: "for 4 hours · extra hours at ₹129/hour",
  full_day: "for 8 hours · extra hours at ₹129/hour",
  monthly_office: "starting from ₹6,999/month",
  outstation_one_way: "per hour (one-way)",
  outstation_round_trip: "per hour · night halt ₹399/night",
  airport_pickup_drop: "per hour · airport, station, bus stop",
};

function priceText(type: string, r: any): { price: string; note: string } {
  if (r.monthly) return { price: `${money(r.basePrice)}`, note: "per month" };
  if (r.basePrice > 0 && r.perHour > 0 && r.includedHours > 0)
    return { price: money(r.basePrice), note: `for ${r.includedHours} hour${r.includedHours === 1 ? "" : "s"} · extra hours ${money(r.perHour)}/hour` };
  if (r.basePrice > 0) return { price: money(r.basePrice), note: FALLBACK_NOTES[type] ?? "" };
  return { price: `${money(r.perHour)}`, note: r.nightHalt ? `per hour · night halt ${money(r.nightHalt)}/night` : "per hour" };
}

/** Homepage price list, live from admin settings (falls back to poster rates offline). */
export function PriceList() {
  const [live, setLive] = useState<{ type: string; rates: any }[] | null>(null);

  useEffect(() => {
    api<{ services: { type: string; rates: any }[] }>("/services", { auth: false })
      .then((r) => setLive(r.services))
      .catch(() => setLive(null));
  }, []);

  const rows = live ?? FALLBACK_ORDER.map((type) => ({ type, rates: null }));
  return (
    <ul className="mt-4 divide-y divide-slate-100">
      {rows.map(({ type, rates }) => {
        const { price, note } = rates ? priceText(type, rates) : { price: FALLBACK_PRICES[type] ?? "…", note: FALLBACK_NOTES[type] ?? "" };
        return (
          <li key={type} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="font-medium">{SERVICE_LABEL[type] ?? type}</p>
              <p className="text-xs text-slate-500">{note}</p>
            </div>
            <p className="whitespace-nowrap font-semibold">{price || "…"}</p>
          </li>
        );
      })}
      <li className="flex items-start justify-between gap-4 py-3">
        <div>
          <p className="font-medium">Late-night service (10 PM–6 AM)</p>
          <p className="text-xs text-slate-500">additional charge</p>
        </div>
        <p className="whitespace-nowrap font-semibold">+₹99</p>
      </li>
    </ul>
  );
}
