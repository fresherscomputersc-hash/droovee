import type { Request, Response } from "express";
import { config } from "../config";

/** Short-lived access JWT. Path=/ so it is sent with every API call. */
export const ACCESS_COOKIE = "droovee_at";
/** Long-lived opaque refresh token. Scoped to the auth path to limit exposure. */
export const REFRESH_COOKIE = "droovee_rt";

/**
 * Tokens travel in httpOnly cookies so that page JavaScript (and any XSS)
 * can never read them. The web app keeps only non-sensitive UI state
 * (kind/role/permissions) in localStorage.
 *
 * Same-origin deploy (recommended: web rewrites /api/* to the API, so the
 * browser only ever sees one domain) works with the Lax default.
 * If the browser ever calls the API cross-origin (e.g. a mobile app hitting
 * the API URL directly), set COOKIE_SAMESITE=none — browsers require Secure
 * with None, which production always sets.
 */
function cookieSameSite(): "lax" | "none" | "strict" {
  const v = (process.env.COOKIE_SAMESITE ?? "").toLowerCase();
  if (v === "none" || v === "strict" || v === "lax") return v;
  return "lax";
}

function baseOpts(maxAgeMs: number, path: string) {
  const sameSite = cookieSameSite();
  return {
    httpOnly: true,
    // Local dev is plain http; browsers reject Secure cookies over http.
    // SameSite=None is rejected without Secure, so force it there.
    secure: config.env === "production" || sameSite === "none",
    sameSite,
    path,
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, baseOpts(config.accessTokenTtlSeconds * 1000, "/"));
  res.cookie(REFRESH_COOKIE, refreshToken, baseOpts(config.refreshTokenTtlDays * 86_400_000, "/api/v1/auth"));
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
}

function cookiesOf(req: Request): Record<string, string> {
  return (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
}

/** Access token from the cookie (used when no Authorization header is present). */
export function accessFromReq(req: Request): string | undefined {
  return cookiesOf(req)[ACCESS_COOKIE];
}

/** Refresh token from the cookie (used when the body does not carry one). */
export function refreshFromReq(req: Request): string | undefined {
  return cookiesOf(req)[REFRESH_COOKIE];
}
