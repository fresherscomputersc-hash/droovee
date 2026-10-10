import { randomBytes, randomInt } from "crypto";

/** Non-guessable public booking reference, e.g. DRV-K7Q2M9XH. Unambiguous alphabet (no 0/O/1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newBookingNumber(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `DRV-${out}`;
}

/** 6-digit numeric OTP. */
export function newOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** E.164 Indian mobile normalisation. Accepts 10 digits, 0XXXXXXXXXX, +91XXXXXXXXXX, 91XXXXXXXXXX. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, "");
  let national: string | null = null;
  if (/^\+91[6-9]\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^91[6-9]\d{9}$/.test(digits)) national = digits.slice(2);
  else if (/^0[6-9]\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^[6-9]\d{9}$/.test(digits)) national = digits;
  return national ? `+91${national}` : null;
}

/**
 * List-view PII minimisation: "+919876500001" → "+91******01".
 * Detail views keep the full number (staff need it to call the customer).
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  const cc = phone.trim().startsWith("+") ? `+${digits.slice(0, digits.length - 10)}` : "";
  return `${cc}******${digits.slice(-2)}`;
}
