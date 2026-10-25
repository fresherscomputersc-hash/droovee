import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";

const API_TARGET = process.env.API_TARGET ?? "http://127.0.0.1:4000";
const ACCESS_COOKIE = "droovee_at";
const REFRESH_COOKIE = "droovee_rt";

/**
 * Same secret as the API. Until this is configured in Vercel, the middleware
 * falls back to the old /auth/me round-trip so authentication still works.
 */
const secret = process.env.JWT_ACCESS_SECRET;
const secretKey = secret ? new TextEncoder().encode(secret) : null;

function loginRedirect(request: NextRequest, pathname: string) {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

type TokenVerdict = "staff" | "other" | "invalid";

async function verifyStaffToken(token: string): Promise<TokenVerdict> {
  if (!secretKey) return "invalid";
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    return payload.kind === "staff" && typeof payload.sub === "string" && payload.sub ? "staff" : "other";
  } catch {
    return "invalid";
  }
}

async function apiStaffCheck(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_TARGET}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      // Short timeout to prevent lagging on dead backends.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.kind === "staff";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page itself to load without authentication.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  // Without the API's secret in this deployment, keep the previous behaviour:
  // one server-side check against /auth/me. Add JWT_ACCESS_SECRET in Vercel to
  // make this a local signature + claims check with no API round-trip.
  if (!secretKey) {
    if (!token) return loginRedirect(request, pathname);
    return (await apiStaffCheck(token)) ? NextResponse.next() : loginRedirect(request, pathname);
  }

  if (token) {
    const verdict = await verifyStaffToken(token);
    if (verdict === "staff") return NextResponse.next();
    // A valid customer/driver token must never open the staff console.
    if (verdict === "other") return loginRedirect(request, pathname);
  }

  // An expired access token is normal after 15 minutes. If the httpOnly refresh
  // cookie is still present, let the page load; the client refreshes and the
  // API remains the authority for every data call. No refresh cookie = sign in.
  if (refresh) return NextResponse.next();

  return loginRedirect(request, pathname);
}

export const config = {
  matcher: ["/admin/:path*"],
};
