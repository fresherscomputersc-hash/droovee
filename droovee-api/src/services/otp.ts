import { config } from "../config";
import { OtpModel } from "../models";
import { AppError } from "../lib/errors";
import { newOtp } from "../lib/ids";
import { hmac, safeEqualHex } from "../lib/tokens";

export type OtpPurpose = "login" | "register" | "verify_phone";

/**
 * SMS delivery is a pluggable provider. No provider is wired in yet.
 * In production this throws until a real provider (e.g. an Indian SMS gateway) is configured.
 * In development the code is returned to the caller so the flow can be tested end-to-end.
 * The OTP is never written to logs.
 */
export interface OtpSender {
  send(phone: string, code: string, purpose: OtpPurpose): Promise<void>;
}

export const devOtpSender: OtpSender = {
  async send() {
    /* no-op: the dev response carries the code */
  },
};

export const productionOtpSender: OtpSender = {
  async send() {
    throw new AppError(500, "INTERNAL", "No SMS provider is configured.");
  },
};

let sender: OtpSender = config.env === "production" ? productionOtpSender : devOtpSender;
export function setOtpSender(s: OtpSender) {
  sender = s;
}

export async function requestOtp(phone: string, purpose: OtpPurpose): Promise<{ debugCode?: string; expiresInSeconds: number }> {
  const last = await OtpModel.findOne({ phone, purpose }).sort({ createdAt: -1 }).lean();
  if (last && Date.now() - new Date(last.createdAt as Date).getTime() < config.otpResendCooldownSeconds * 1000) {
    throw new AppError(429, "RATE_LIMITED", "Please wait before requesting another code.");
  }
  const code = newOtp();
  await OtpModel.create({
    phone,
    purpose,
    codeHash: hmac(`${phone}|${purpose}|${code}`),
    expiresAt: new Date(Date.now() + config.otpTtlMinutes * 60_000),
  });
  await sender.send(phone, code, purpose);
  const expiresInSeconds = config.otpTtlMinutes * 60;
  // The code is only ever returned when explicitly enabled for local testing
  // (OTP_DEBUG=true). Never in production or any networked non-prod env —
  // otherwise anyone knowing a phone number could read its code.
  const debug = process.env.OTP_DEBUG === "true" && config.env !== "production";
  return debug ? { debugCode: code, expiresInSeconds } : { expiresInSeconds };
}

/** Verifies the most recent unconsumed, unexpired OTP. Enforces attempt limits. */
export async function verifyOtp(phone: string, purpose: OtpPurpose, code: string): Promise<void> {
  const otp = await OtpModel.findOne({
    phone,
    purpose,
    consumedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select("+codeHash");
  if (!otp) throw new AppError(400, "VALIDATION_ERROR", "Code is invalid or has expired. Request a new one.");
  if (otp.attempts >= config.otpMaxAttempts) {
    throw new AppError(429, "RATE_LIMITED", "Too many attempts. Request a new code.");
  }
  otp.attempts += 1;
  const ok = safeEqualHex(otp.codeHash, hmac(`${phone}|${purpose}|${code}`));
  if (!ok) {
    await otp.save();
    throw new AppError(400, "VALIDATION_ERROR", "Code is incorrect.");
  }
  otp.consumedAt = new Date();
  await otp.save();
}
