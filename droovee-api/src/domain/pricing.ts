import { ActiveSettings, ServiceRates } from "./settings";

export type ServiceType = keyof ActiveSettings["pricing"]["services"];

export interface EstimateInput {
  serviceType: ServiceType;
  /** Hours requested (for hourly/half-day/full-day/airport/outstation hourly). */
  durationHours: number;
  /** Start time, used to decide late-night surcharge. */
  startAt: Date;
  /** Trip nights (outstation night halt). */
  nights?: number;
  /** Optional coupon: a fixed price for the first hour (₹99 launch offer). */
  firstHourCouponPrice?: number;
  /** Timezone offset in minutes for the local window (IST = 330). */
  utcOffsetMinutes?: number;
}

export interface FareLine {
  label: string;
  amount: number;
}

export interface FareEstimate {
  /** Always true: estimates are labelled, final fare may change. */
  isEstimate: true;
  currency: "INR";
  lines: FareLine[];
  total: number;
  /** True if the result depends on a rule that is not yet confirmed. */
  usesUnconfirmedRules: boolean;
  unconfirmedNotes: string[];
}

/** Returns true if `startAt` (shifted to local time) falls in the late-night window. */
export function isLateNight(startAt: Date, startHour: number, endHour: number, utcOffsetMinutes = 330): boolean {
  const local = new Date(startAt.getTime() + utcOffsetMinutes * 60_000);
  const h = local.getUTCHours();
  // Window crosses midnight (e.g. 22 -> 6).
  return startHour > endHour ? h >= startHour || h < endHour : h >= startHour && h < endHour;
}

/**
 * Pure fare calculator. Uses the active settings.
 * Combination of package, extra hours, late-night and nights is governed by
 * `pricing.combinationRule`, which is unconfirmed, so the estimate is flagged.
 */
export function estimateFare(input: EstimateInput, s: ActiveSettings): FareEstimate {
  const p = s.pricing;
  const rates: ServiceRates = p.services[input.serviceType];
  if (!rates) throw new Error(`Unknown service type: ${input.serviceType}`);
  if (!(input.durationHours > 0)) throw new Error("durationHours must be > 0");

  const lines: FareLine[] = [];
  const notes: string[] = [];
  if (p.combinationRule.status === "unconfirmed") notes.push(p.combinationRule.note ?? "combinationRule unconfirmed");

  const hours = input.durationHours;
  const extraHours = Math.max(0, hours - rates.includedHours);

  if (rates.monthly) {
    lines.push({ label: "Monthly office pickup/drop package", amount: rates.basePrice });
  } else if (input.serviceType === "outstation_round_trip" || input.serviceType === "outstation_one_way") {
    // Outstation: per-hour charge; night halt added per night.
    const hourlyCharge = hours * rates.perHour;
    lines.push({ label: `Outstation ${input.serviceType === "outstation_one_way" ? "one way" : "round trip"} (${hours} h)`, amount: hourlyCharge });
    const nights = input.nights ?? 0;
    if (nights > 0 && rates.nightHalt) {
      lines.push({ label: `Night halt x${nights}`, amount: nights * rates.nightHalt });
    }
  } else if (input.serviceType === "airport_pickup_drop") {
    lines.push({ label: `Airport/station/bus-stop pickup/drop (${hours} h)`, amount: hours * rates.perHour });
  } else {
    // hourly, half_day, full_day
    lines.push({ label: `${input.serviceType} base package`, amount: rates.basePrice });
    if (extraHours > 0) {
      lines.push({ label: `Additional ${extraHours} h`, amount: extraHours * p.additionalHourRate.value });
    }
  }

  // First-hour coupon: replaces the first hour's charge with the coupon price (₹99 offer).
  if (input.firstHourCouponPrice !== undefined && input.serviceType === "hourly") {
    const firstHourFull = rates.basePrice;
    const discount = Math.max(0, firstHourFull - input.firstHourCouponPrice);
    if (discount > 0) lines.push({ label: "First-hour launch offer", amount: -discount });
  }

  const { startHour, endHour } = p.lateNightWindow.value;
  if (isLateNight(input.startAt, startHour, endHour, input.utcOffsetMinutes ?? 330)) {
    lines.push({ label: "Late-night surcharge (10 PM–6 AM)", amount: p.lateNightSurcharge.value });
  }

  const total = Math.max(0, lines.reduce((sum, l) => sum + l.amount, 0));
  return {
    isEstimate: true,
    currency: "INR",
    lines,
    total,
    usesUnconfirmedRules: rates.status === "unconfirmed" || p.combinationRule.status === "unconfirmed",
    unconfirmedNotes: notes,
  };
}
