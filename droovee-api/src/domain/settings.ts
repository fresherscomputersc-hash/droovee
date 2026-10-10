/**
 * Business settings for Droovee.
 *
 * Every value carries a `status`:
 *  - "confirmed":   approved by the client in the requirements answers.
 *  - "unconfirmed": a placeholder default. It is NOT an approved production policy.
 *                   Admins must confirm or change it (via the settings API) before launch.
 *
 * In production, these defaults should be replaced by a versioned `settings` document
 * in MongoDB. The code always reads the active version, never hard-coded constants.
 */

export type Status = "confirmed" | "unconfirmed";

export interface Setting<T> {
  value: T;
  status: Status;
  note?: string;
}

export interface ServiceRates {
  /** Base price for the package. */
  basePrice: number;
  /** Hours included in the base price (0 = per-hour pricing). */
  includedHours: number;
  /** Price per hour for hours beyond included, or for per-hour services. */
  perHour: number;
  /** Price per night (outstation night halt). */
  nightHalt?: number;
  /** Price of a flat monthly package. */
  monthly?: boolean;
  status: Status;
}

export interface PricingSettings {
  services: Record<"hourly" | "half_day" | "full_day" | "monthly_office" | "outstation_one_way" | "outstation_round_trip" | "airport_pickup_drop", ServiceRates>;
  additionalHourRate: Setting<number>;
  lateNightSurcharge: Setting<number>;
  lateNightWindow: Setting<{ startHour: number; endHour: number }>;
  nightHaltRate: Setting<number>;
  /** How charges combine. Unconfirmed: see note. */
  combinationRule: Setting<"package_plus_extras">;
  currency: "INR";
}

export interface PolicySettings {
  /** Minimum minutes between "now" and a scheduled start. */
  minLeadTimeMinutes: Setting<number>;
  /** Buffer minutes between two trips assigned to the same driver. */
  driverBufferMinutes: Setting<number>;
  /** Cancellation fee, as a flat amount, charged inside `cancellationWindowMinutes`. */
  cancellationFee: Setting<number>;
  cancellationWindowMinutes: Setting<number>;
  /** When payment is collected. */
  paymentTiming: Setting<"at_booking" | "before_trip" | "after_trip" | "advance_then_balance">;
  /** Advance collected at booking, as a percentage of the total (used with advance_then_balance). */
  advancePercent: Setting<number>;
  /** Whether customers can confirm completion. */
  customerCompletionConfirmation: Setting<boolean>;
}

export const DEFAULT_PRICING: PricingSettings = {
  services: {
    hourly: { basePrice: 149, includedHours: 1, perHour: 89, status: "confirmed" },
    half_day: { basePrice: 379, includedHours: 4, perHour: 89, status: "confirmed" },
    full_day: { basePrice: 849, includedHours: 8, perHour: 89, status: "confirmed" },
    monthly_office: { basePrice: 5999, includedHours: 0, perHour: 0, monthly: true, status: "confirmed" },
    outstation_one_way: { basePrice: 0, includedHours: 0, perHour: 199, status: "confirmed" },
    outstation_round_trip: { basePrice: 0, includedHours: 0, perHour: 169, nightHalt: 399, status: "confirmed" },
    airport_pickup_drop: { basePrice: 0, includedHours: 0, perHour: 159, status: "confirmed" },
  },
  additionalHourRate: { value: 89, status: "confirmed", note: "Poster: additional hours at ₹89/hour." },
  lateNightSurcharge: { value: 99, status: "confirmed", note: "Poster: late-night 10 PM–6 AM, additional ₹99." },
  lateNightWindow: { value: { startHour: 22, endHour: 6 }, status: "confirmed" },
  nightHaltRate: { value: 399, status: "confirmed" },
  combinationRule: {
    value: "package_plus_extras",
    status: "confirmed",
    note: "Client answer: package price + additional hours + late-night surcharge, summed once per booking.",
  },
  currency: "INR",
};

export const DEFAULT_POLICY: PolicySettings = {
  minLeadTimeMinutes: { value: 0, status: "unconfirmed", note: "Not specified. 0 = no restriction." },
  driverBufferMinutes: { value: 0, status: "unconfirmed", note: "Not specified. Set before launch." },
  cancellationFee: { value: 0, status: "unconfirmed", note: "Client answer: admin decides the fee. Flat amount is a placeholder until set." },
  cancellationWindowMinutes: { value: 0, status: "unconfirmed", note: "Client answer: admin decides. Window is a placeholder until set." },
  paymentTiming: { value: "advance_then_balance", status: "confirmed", note: "Client answer: 60% advance at booking, balance on completion." },
  advancePercent: { value: 60, status: "confirmed", note: "Client answer: 60% advance at booking." },
  customerCompletionConfirmation: { value: true, status: "confirmed", note: "Client answer: customer confirms completion." },
};

export interface ActiveSettings {
  pricing: PricingSettings;
  policy: PolicySettings;
}

export function getDefaultSettings(): ActiveSettings {
  return { pricing: DEFAULT_PRICING, policy: DEFAULT_POLICY };
}

/** Returns the list of unconfirmed settings, so the admin dashboard can show them. */
export function listUnconfirmed(s: ActiveSettings): string[] {
  const out: string[] = [];
  const walk = (prefix: string, obj: unknown) => {
    if (obj && typeof obj === "object") {
      const o = obj as Record<string, unknown>;
      if (o.status === "unconfirmed") out.push(prefix);
      for (const [k, v] of Object.entries(o)) {
        if (k !== "status" && k !== "note") walk(prefix ? `${prefix}.${k}` : k, v);
      }
    }
  };
  walk("", s);
  return out;
}
