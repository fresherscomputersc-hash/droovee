const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n: number | null | undefined) => (n == null ? "—" : inr.format(n));

const ist = { timeZone: "Asia/Kolkata" } as const;
export const dateTime = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { ...ist, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
export const dateOnly = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { ...ist, day: "2-digit", month: "short", year: "numeric" }) : "—";
export const timeOnly = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { ...ist, hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

/** Converts a value from <input type="datetime-local"> (IST wall time) to an ISO string with +05:30. */
export function istInputToIso(v: string): string {
  return v ? `${v}:00+05:30` : "";
}
/** ISO → value for <input type="datetime-local"> in IST. */
export function isoToIstInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 330 * 60_000);
  return d.toISOString().slice(0, 16);
}

export const SERVICE_LABEL: Record<string, string> = {
  hourly: "Hourly driver",
  half_day: "Half-day driver (4 h)",
  full_day: "Full-day driver (8 h)",
  monthly_office: "Monthly office pickup & drop",
  outstation_one_way: "Outstation — one way",
  outstation_round_trip: "Outstation — round trip",
  airport_pickup_drop: "Airport / railway / bus-stop pickup & drop",
};

export const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  driver_assigned: "Driver assigned",
  driver_on_the_way: "Driver on the way",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  customer_no_show: "Customer no-show",
};

export const STATUS_TONE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  driver_assigned: "bg-indigo-100 text-indigo-800",
  driver_on_the_way: "bg-violet-100 text-violet-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700",
  rejected: "bg-rose-100 text-rose-800",
  customer_no_show: "bg-rose-100 text-rose-800",
};

export const ROLE_LABEL: Record<string, string> = {
  owner_super_admin: "Owner / Super admin",
  operations: "Operations",
  support: "Support",
  finance: "Finance",
};
