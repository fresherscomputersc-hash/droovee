import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_TARGET = process.env.API_TARGET ?? "http://127.0.0.1:4000";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page itself to load without authentication
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  // Guard all other /admin routes server-side (DR-SEC-005)
  const token = request.cookies.get("droovee_at")?.value;
  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const res = await fetch(`${API_TARGET}/api/v1/auth/me`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
      // Short timeout to prevent lagging on dead backends
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const data = await res.json();
    if (data.kind !== "staff") {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch {
    // If backend check fails or times out, redirect to admin login for safety
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
