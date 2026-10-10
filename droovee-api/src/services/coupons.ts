import { Types } from "mongoose";
import { CouponModel, CouponRedemptionModel } from "../models";
import { AppError } from "../lib/errors";

export interface ValidCoupon {
  id: string;
  code: string;
  type: "first_hour_price";
  value: number;
  minAmount: number;
  perCustomerLimit: number;
}

/**
 * Validates a coupon for a service. Does not consume it.
 * Consumption happens atomically at booking creation (see consumeCoupon).
 * minAmount is checked separately against the computed fare (see
 * assertCouponMinAmount) because the total is unknown until pricing runs.
 */
export async function validateCoupon(code: string, serviceType: string, now = new Date()): Promise<ValidCoupon> {
  const coupon = await CouponModel.findOne({ code: code.toUpperCase(), active: true }).lean();
  if (!coupon) throw new AppError(400, "VALIDATION_ERROR", "Coupon code is not valid.", { couponCode: "invalid" });
  if (now < coupon.validFrom || now > coupon.validTo) {
    throw new AppError(400, "VALIDATION_ERROR", "Coupon code has expired or is not yet active.", { couponCode: "expired" });
  }
  if (coupon.eligibleServices.length && !coupon.eligibleServices.includes(serviceType)) {
    throw new AppError(400, "VALIDATION_ERROR", "Coupon code does not apply to this service.", { couponCode: "ineligible" });
  }
  // first_hour_price only discounts hourly trips; accepting it elsewhere
  // would validate a coupon worth ₹0 and mislead the customer.
  if (coupon.type === "first_hour_price" && serviceType !== "hourly") {
    throw new AppError(400, "VALIDATION_ERROR", "Coupon code does not apply to this service.", { couponCode: "ineligible" });
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(400, "VALIDATION_ERROR", "Coupon code has been fully used.", { couponCode: "exhausted" });
  }
  return {
    id: String(coupon._id),
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minAmount: coupon.minAmount ?? 0,
    perCustomerLimit: coupon.perCustomerLimit ?? 0,
  };
}

/** Rejects the coupon when the (pre-discount) fare is below its minAmount. */
export function assertCouponMinAmount(coupon: ValidCoupon, total: number): void {
  if (coupon.minAmount > 0 && total < coupon.minAmount) {
    throw new AppError(400, "VALIDATION_ERROR", `This coupon needs a minimum fare of ₹${coupon.minAmount}.`, {
      couponCode: "below_minimum",
    });
  }
}

/** True when this customer already redeemed a once-per-customer coupon. */
export async function alreadyRedeemed(code: string, customerId: Types.ObjectId): Promise<boolean> {
  return (await CouponRedemptionModel.exists({ code: code.toUpperCase(), customerId })) !== null;
}

/**
 * Records a per-customer redemption. Returns false when the customer already
 * redeemed it (unique index) — the caller must roll back the booking.
 */
export async function recordRedemption(args: {
  code: string;
  couponId: string;
  customerId: Types.ObjectId;
  bookingId: Types.ObjectId;
}): Promise<boolean> {
  try {
    await CouponRedemptionModel.create({
      code: args.code.toUpperCase(),
      couponId: new Types.ObjectId(args.couponId),
      customerId: args.customerId,
      bookingId: args.bookingId,
    });
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false;
    throw e;
  }
}

/** Atomically consumes one use. Returns false if the usage limit was reached concurrently. */
export async function consumeCoupon(code: string): Promise<boolean> {
  const res = await CouponModel.updateOne(
    {
      code: code.toUpperCase(),
      active: true,
      $or: [{ usageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
    },
    { $inc: { usedCount: 1 } },
  );
  return res.modifiedCount === 1;
}

/** Rolls back one consumed use (booking deleted after consumption). */
export async function releaseCouponUse(code: string): Promise<void> {
  await CouponModel.updateOne({ code: code.toUpperCase() }, { $inc: { usedCount: -1 } });
}
