import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid numeric environment variable: ${name}=${raw}`);
  return n;
}

/**
 * Server configuration. Values are read lazily from process.env so that
 * (a) tests can set env vars after import, and (b) missing secrets fail
 * fast at first use instead of silently signing tokens with a fallback.
 * There are deliberately NO fallback secrets: JWT_ACCESS_SECRET and
 * TOKEN_PEPPER are required in every environment, including development.
 */
export const config = {
  get env(): string {
    return process.env.NODE_ENV ?? "development";
  },
  get port(): number {
    return num("PORT", 4000);
  },
  get mongoUri(): string {
    return process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/droovee";
  },
  /** Required in ALL environments. No default: a missing secret must crash, never fall back. */
  get jwtAccessSecret(): string {
    return req("JWT_ACCESS_SECRET");
  },
  get accessTokenTtlSeconds(): number {
    return num("ACCESS_TOKEN_TTL_SECONDS", 900);
  },
  get refreshTokenTtlDays(): number {
    return num("REFRESH_TOKEN_TTL_DAYS", 30);
  },
  /** Driver portal sessions are shift-length (12h) instead of the 15-minute staff access token. */
  get driverTokenTtlSeconds(): number {
    return num("DRIVER_TOKEN_TTL_SECONDS", 12 * 60 * 60);
  },
  /** Pepper for hashing OTPs and refresh tokens. Required in ALL environments. */
  get tokenPepper(): string {
    return req("TOKEN_PEPPER");
  },
  get otpTtlMinutes(): number {
    return num("OTP_TTL_MINUTES", 5);
  },
  get otpMaxAttempts(): number {
    return num("OTP_MAX_ATTEMPTS", 5);
  },
  get otpResendCooldownSeconds(): number {
    return num("OTP_RESEND_COOLDOWN_SECONDS", 60);
  },
  /** OTP is off for now (password login only). Set OTP_ENABLED=true to enable. */
  get otpEnabled(): boolean {
    return process.env.OTP_ENABLED === "true";
  },
  /** Outgoing email (booking confirmations, password resets). Unset = skip sending, booking still succeeds. */
  get smtpHost(): string {
    return process.env.SMTP_HOST ?? "";
  },
  get smtpPort(): number {
    return num("SMTP_PORT", 587);
  },
  get smtpUser(): string {
    return process.env.SMTP_USER ?? "";
  },
  get smtpPass(): string {
    return process.env.SMTP_PASS ?? "";
  },
  get smtpFrom(): string {
    return process.env.SMTP_FROM ?? "Droovee <no-reply@droovee.in>";
  },
  get smtpConfigured(): boolean {
    return this.smtpHost !== "" && this.smtpUser !== "" && this.smtpPass !== "";
  },
  /** Public web URL, used to build password-reset links in emails. */
  get webUrl(): string {
    return (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  /** Customer-facing service timezone (used for display and late-night window). */
  utcOffsetMinutes: 330, // Asia/Kolkata (IST, no DST)
};

/**
 * Call once at startup (every environment) to fail fast on missing secrets.
 * Secrets are otherwise enforced lazily on first use.
 */
export function assertRequiredConfig(): void {
  req("JWT_ACCESS_SECRET");
  req("TOKEN_PEPPER");
  if (config.env === "production") req("MONGODB_URI");
}

/** @deprecated Use assertRequiredConfig (now enforced in all environments). */
export const assertProductionConfig = assertRequiredConfig;
