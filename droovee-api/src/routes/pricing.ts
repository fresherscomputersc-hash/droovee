import { Router } from "express";
import { z } from "zod";
import { estimateFare, ServiceType } from "../domain/pricing";
import { getActiveSettings } from "../services/settings";
import { validateCoupon, assertCouponMinAmount } from "../services/coupons";
import { validateQuery } from "../lib/validate";
import { estimateLimiter } from "../lib/rateLimit";
import { AppError } from "../lib/errors";

export const pricingRouter = Router();

export const SERVICE_TYPES = [
  "hourly",
  "half_day",
  "full_day",
  "monthly_office",
  "outstation_one_way",
  "outstation_round_trip",
  "airport_pickup_drop",
] as const;

const estimateQuery = z.object({
  serviceType: z.enum(SERVICE_TYPES),
  durationHours: z.coerce.number().min(0.5).max(24 * 31),
  startAt: z.coerce.date(),
  nights: z.coerce.number().int().min(0).max(60).optional(),
  couponCode: z.string().trim().max(40).optional(),
});

/** Public estimate. Labelled as an estimate; final fare may change (FR-PAY-02). */
pricingRouter.get("/estimate", estimateLimiter(), validateQuery(estimateQuery), async (req, res) => {
  const q = (req as unknown as { validatedQuery: z.infer<typeof estimateQuery> }).validatedQuery;
  const { version, settings } = await getActiveSettings();
  // NOTE: the estimate is unauthenticated, so the per-customer redemption cap
  // cannot be checked here — booking creation enforces it authoritatively.
  const coupon = q.couponCode ? await validateCoupon(q.couponCode, q.serviceType) : undefined;
  try {
    const fareInput = {
      serviceType: q.serviceType as ServiceType,
      durationHours: q.durationHours,
      startAt: q.startAt,
      nights: q.nights,
    };
    const base = estimateFare(fareInput, settings);
    if (coupon) assertCouponMinAmount(coupon, base.total);
    const est =
      coupon?.type === "first_hour_price" ? estimateFare({ ...fareInput, firstHourCouponPrice: coupon.value }, settings) : base;
    res.json({ ...est, settingsVersion: version, couponCode: q.couponCode?.toUpperCase() });
  } catch (e) {
    // estimateFare throws plain Errors; coupon checks throw AppError with
    // fieldErrors — preserve them so the client can highlight the field.
    const app = e as Partial<AppError>;
    throw new AppError(400, "VALIDATION_ERROR", (e as Error).message, app.fieldErrors);
  }
});
