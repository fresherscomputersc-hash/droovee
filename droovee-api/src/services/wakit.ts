import { config } from "../config";
import { AppError } from "../lib/errors";

/**
 * Minimal Wakit client for the OTP endpoints.
 * Docs: https://wakit.in/docs
 *
 * Wakit generates the code, stores only its hash, and verifies it by message id.
 * We never see or store the plaintext code in this flow.
 */
type WakitAction = "send" | "verify";

type WakitEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    type?: string;
    code?: string;
    message?: string;
  };
};

type WakitSendData = {
  id?: string;
  status?: string;
  channel?: string;
  expires_at?: string;
};

type WakitVerifyData = {
  verified?: boolean;
  status?: string;
};

function failureMessage(action: WakitAction, fallback: string): string {
  return action === "verify" ? "Could not verify the code. Try again." : fallback;
}

async function post<T>(path: string, body: unknown, action: WakitAction): Promise<T> {
  const apiKey = config.wakitApiKey;
  if (!apiKey) throw new AppError(500, "INTERNAL", "WhatsApp OTP is not configured.");

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${config.wakitBaseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.wakitTimeoutMs),
    });
  } catch (err) {
    // Never log the API key, phone number, or code.
    console.error(JSON.stringify({ level: "error", msg: "Wakit request failed", action, error: (err as Error).message }));
    throw new AppError(500, "INTERNAL", failureMessage(action, "Could not send the verification code. Try again."));
  }

  let json: WakitEnvelope<T> | null = null;
  try {
    json = (await res.json()) as WakitEnvelope<T>;
  } catch {
    /* fall through to the status/error handling below */
  }

  if (!res.ok || !json?.success || !json.data) {
    const type = json?.error?.type;
    const code = json?.error?.code;
    console.error(JSON.stringify({ level: "error", msg: "Wakit request rejected", action, status: res.status, type, code }));

    if (res.status === 401 || res.status === 403) {
      throw new AppError(500, "INTERNAL", "WhatsApp OTP is not configured correctly.");
    }
    if (res.status === 402) {
      throw new AppError(500, "INTERNAL", "WhatsApp OTP is temporarily unavailable. Try again later.");
    }
    if (res.status === 404) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        action === "verify" ? "Code is invalid or has expired. Request a new one." : "Enter a valid mobile number.",
      );
    }
    if (res.status === 422) {
      if (type === "contact_blocked") {
        throw new AppError(400, "VALIDATION_ERROR", "This number cannot receive WhatsApp messages.");
      }
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        action === "verify" ? "Code is incorrect." : "Enter a valid mobile number.",
      );
    }
    if (res.status === 429) {
      throw new AppError(429, "RATE_LIMITED", "Please wait before requesting another code.");
    }
    throw new AppError(500, "INTERNAL", failureMessage(action, "Could not send the verification code. Try again."));
  }

  return json.data;
}

export type SentWakitOtp = {
  id: string;
  expiresAt: Date;
};

/** Asks Wakit to generate and send a WhatsApp OTP. */
export async function sendWakitOtp(phone: string): Promise<SentWakitOtp> {
  const data = await post<WakitSendData>("/otp/send", { to: phone, code_length: 6 }, "send");
  if (!data.id) {
    console.error(JSON.stringify({ level: "error", msg: "Wakit send response missing id" }));
    throw new AppError(500, "INTERNAL", "Could not send the verification code. Try again.");
  }

  const fallback = new Date(Date.now() + config.otpTtlMinutes * 60_000);
  const parsed = data.expires_at ? new Date(data.expires_at) : fallback;
  const expiresAt = Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now() ? parsed : fallback;

  return { id: data.id, expiresAt };
}

/** Verifies a code against the Wakit message id. Each call consumes one attempt. */
export async function verifyWakitOtp(id: string, code: string): Promise<boolean> {
  const data = await post<WakitVerifyData>("/otp/verify", { id, code }, "verify");
  return data.verified === true;
}
