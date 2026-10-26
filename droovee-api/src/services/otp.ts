import { config } from "../config";
import { OtpModel } from "../models";
import { AppError } from "../lib/errors";
import { newOtp } from "../lib/ids";
import { hmac, safeEqualHex } from "../lib/tokens";
import { sendWakitOtp, verifyWakitOtp } from "./wakit";

export type OtpPurpose = "login" | "register" | "verify_phone";
export type OtpProvider = "local" | "wakit";

/**
 * Production OTP delivery goes through Wakit (WhatsApp). Wakit generates the
 * code and stores only its hash; we keep the message id so POST /otp/verify can
 * check the code the customer typed.
 *
 * Local development can still use a Droovee-generated code when OTP_DEBUG=true.
 * That path is deliberately unavailable in production.
 */
function activeProvider(): OtpProvider {
  if (config.otpProvider === "wakit") {
    if (!config.wakitApiKey) throw new AppError(500, "INTERNAL", "WhatsApp OTP is not configured.");
    return "wakit";
  }
  if (config.env === "production") {
    throw new AppError(500, "INTERNAL", "No OTP provider is configured.");
  }
  return "local";
}

export async function requestOtp(
  phone: string,
  purpose: OtpPurpose,
): Promise<{ debugCode?: string; expiresInSeconds: number }> {
  const last = await OtpModel.findOne({ phone, purpose }).sort({ createdAt: -1 }).lean();
  if (last && Date.now() - new Date(last.createdAt as Date).getTime() < config.otpResendCooldownSeconds * 1000) {
    throw new AppError(429, "RATE_LIMITED", "Please wait before requesting another code.");
  }

  const provider = activeProvider();

  if (provider === "wakit") {
    const sent = await sendWakitOtp(phone);
    await OtpModel.create({
      phone,
      purpose,
      provider,
      providerId: sent.id,
      expiresAt: sent.expiresAt,
    });
    return {
      expiresInSeconds: Math.max(1, Math.ceil((sent.expiresAt.getTime() - Date.now()) / 1000)),
    };
  }

  const code = newOtp();
  const expiresAt = new Date(Date.now() + config.otpTtlMinutes * 60_000);
  await OtpModel.create({
    phone,
    purpose,
    provider,
    codeHash: hmac(`${phone}|${purpose}|${code}`),
    expiresAt,
  });

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

  // Persist the attempt before calling the provider. Wakit consumes an attempt
  // on every verify call, including a wrong code or an expired id.
  otp.attempts += 1;
  await otp.save();

  const provider = (otp.provider ?? "local") as OtpProvider;
  let ok = false;

  if (provider === "wakit") {
    if (!otp.providerId) {
      throw new AppError(400, "VALIDATION_ERROR", "Code is invalid or has expired. Request a new one.");
    }
    ok = await verifyWakitOtp(otp.providerId, code);
  } else {
    if (!otp.codeHash) {
      throw new AppError(400, "VALIDATION_ERROR", "Code is invalid or has expired. Request a new one.");
    }
    ok = safeEqualHex(otp.codeHash, hmac(`${phone}|${purpose}|${code}`));
  }

  if (!ok) throw new AppError(400, "VALIDATION_ERROR", "Code is incorrect.");

  otp.consumedAt = new Date();
  await otp.save();
}
