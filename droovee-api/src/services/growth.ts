import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { CustomerModel, ReferralModel } from "../models";
import { AppError } from "../lib/errors";
import type { ActiveSettings, Pkg } from "../domain/settings";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Referral code: DV + 6 unambiguous chars. */
export function newReferralCode(): string {
  const bytes = randomBytes(6);
  let out = "DV";
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Gives the customer a referral code if they don't have one (backfills older accounts). */
export async function ensureReferralCode(customerId: Types.ObjectId): Promise<string> {
  const c = await CustomerModel.findById(customerId).select("referralCode");
  if (!c) throw new AppError(404, "NOT_FOUND", "Customer not found.");
  if (c.referralCode) return c.referralCode;
  for (let i = 0; i < 5; i++) {
    try {
      c.referralCode = newReferralCode();
      await c.save();
      return c.referralCode;
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  throw new AppError(500, "INTERNAL", "Could not create a referral code.");
}

/** Active fixed-price package from settings, or 400. */
export function resolvePackage(settings: ActiveSettings, packageId: string): Pkg {
  const pkg = (settings.pricing.packages ?? []).find((p) => p.id === packageId && p.active);
  if (!pkg) throw new AppError(400, "VALIDATION_ERROR", "This package is not available.", { packageId: "invalid" });
  return pkg;
}

/** Customer who owns a referral code (not yourself), or 400. */
export async function resolveReferrer(code: string, ownCustomerId: Types.ObjectId) {
  const referrer = await CustomerModel.findOne({ referralCode: code.toUpperCase() });
  if (!referrer) throw new AppError(400, "VALIDATION_ERROR", "This referral code is invalid.", { referralCode: "invalid" });
  if (String(referrer._id) === String(ownCustomerId)) {
    throw new AppError(400, "VALIDATION_ERROR", "You cannot use your own referral code.", { referralCode: "own_code" });
  }
  return referrer;
}

/** Records a referral when the friend books (reward via Coupons once earned). */
export async function recordReferral(code: string, referrerId: Types.ObjectId, referredId: Types.ObjectId, bookingId: Types.ObjectId): Promise<void> {
  await ReferralModel.create({ code: code.toUpperCase(), referrerCustomerId: referrerId, referredCustomerId: referredId, bookingId, status: "recorded" });
}

/** When the referred trip completes, the referrer earns ₹100 credit (redeemed via Coupons). */
export async function earnReferral(bookingId: Types.ObjectId): Promise<void> {
  await ReferralModel.updateMany({ bookingId, status: "recorded" }, { $set: { status: "earned" } });
}
