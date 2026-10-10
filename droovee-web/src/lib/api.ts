import { getSession, setSession } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
    public details?: any,
  ) {
    super(message);
  }
}

const BASE = "/api/v1";

/**
 * Access token kept in module memory only — never localStorage — so it
 * vanishes on page reload and is invisible to XSS. Survives in-app
 * navigation (module scope persists for the tab's lifetime).
 */
let memAccess: string | null = null;

export function setAccessToken(t: string | null) {
  memAccess = t;
}

async function raw(path: string, init: RequestInit & { token?: string | null }) {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as Record<string, string>) };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  // Same-origin via the Next rewrite: cookies (refresh/access) go along.
  return fetch(BASE + path, { ...init, headers, credentials: "include" });
}

/**
 * Silent refresh using the httpOnly refresh cookie. Returns true and stores
 * the new access token in memory, or false when the session is gone.
 */
async function refreshViaCookie(): Promise<boolean> {
  try {
    const r = await fetch(BASE + "/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    if (!r.ok) return false;
    const t = await r.json();
    if (!t?.accessToken) return false;
    memAccess = t.accessToken;
    return true;
  } catch {
    return false;
  }
}

function signOut() {
  memAccess = null;
  setSession(null);
  if (typeof window !== "undefined") {
    const isAdmin = window.location.pathname.startsWith("/admin");
    window.location.href = isAdmin ? "/admin/login" : "/login";
  }
}

/**
 * Calls the API. On 401 it tries one cookie-based token refresh, then signs out.
 * Throws ApiError with the server's code, message and fieldErrors.
 */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const session = getSession();
  if (session && !memAccess && opts.auth !== false && path !== "/auth/refresh") {
    // Fresh page load: recover the access token from the cookie before calling.
    await refreshViaCookie();
  }
  const init: RequestInit & { token?: string | null } = {
    method: opts.method ?? "GET",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    token: opts.auth === false ? null : memAccess,
  };
  let res = await raw(path, init);
  if (res.status === 401 && session && opts.auth !== false) {
    if (await refreshViaCookie()) {
      res = await raw(path, { ...init, token: memAccess });
    } else {
      signOut();
      throw new ApiError(401, "UNAUTHENTICATED", "Your session has ended. Please sign in again.");
    }
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, body.code ?? "ERROR", body.message ?? "Something went wrong.", body.fieldErrors, body.details);
  }
  // Capture rotated access tokens (login/register responses) into memory.
  if (typeof body?.accessToken === "string") memAccess = body.accessToken;
  return body as T;
}
