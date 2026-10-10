import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response } from "express";

/**
 * Layered rate limiting (NFR-03).
 *
 * Single-process in-memory store: correct for one instance. When scaling to
 * multiple API processes, replace with a shared store (e.g. rate-limit-redis).
 *
 * NOTE on `trust proxy`: app.ts trusts one proxy hop (the Next.js rewrite
 * proxy / load balancer). If deployed behind more hops (CDN + LB), set the
 * hop count / trusted CIDRs explicitly or IP-keyed limits can be bypassed
 * with spoofed X-Forwarded-For.
 */

function tooMany(_req: Request, res: Response) {
  res.status(429).json({ code: "RATE_LIMITED", message: "Too many attempts. Try again later.", requestId: "" });
}

function make(windowMs: number, limit: number, keyGenerator?: (req: Request) => string): RateLimitRequestHandler {
  return rateLimit({ windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false, keyGenerator, handler: tooMany });
}

const WINDOW = 15 * 60_000;

/** Backstop for every /api/v1 route. Generous; specific limiters do the real work. */
export const globalLimiter = (): RateLimitRequestHandler => make(WINDOW, 1000);

/** Brute-force / OTP-abuse protection per IP across all auth endpoints. */
export const authLimiter = (): RateLimitRequestHandler => make(WINDOW, 30);

/**
 * Per-account login throttle: 10 attempts per identifier (email/phone) per
 * 15 min, so IP rotation does not defeat it. Falls back to IP when the
 * identifier is absent (it always is on well-formed login calls).
 */
export const loginLimiter = (): RateLimitRequestHandler =>
  make(WINDOW, 10, (req) => {
    const b = req.body as { email?: unknown; phone?: unknown } | undefined;
    const id = String(b?.email ?? b?.phone ?? "")
      .toLowerCase()
      .trim();
    // ipKeyGenerator normalises IPv6 so Alt-Svc / subnet tricks can't dodge the bucket.
    return id || ipKeyGenerator(req.ip ?? "");
  });

/** Coupon-guessing / estimate-scraping protection (estimate is unauthenticated). */
export const estimateLimiter = (): RateLimitRequestHandler => make(WINDOW, 120);

/** Booking-creation spam protection, keyed by authenticated customer. */
export const bookingCreateLimiter = (): RateLimitRequestHandler =>
  make(WINDOW, 60, (req) => {
    const p = (req as Request & { principal?: { id: string } }).principal;
    return p?.id ?? ipKeyGenerator(req.ip ?? "");
  });

/** Backstop for staff console traffic (lists + mutations). */
export const adminLimiter = (): RateLimitRequestHandler => make(WINDOW, 200);
