export type Kind = "customer" | "staff";

export interface Session {
  kind: Kind;
  role?: string;
  /** Permissions returned by the API at sign-in. The server enforces them; the UI only hides controls. */
  permissions?: string[];
  name?: string;
}

const KEY = "droovee.ui";

/**
 * UI-only session: role and permissions for rendering. Tokens are NEVER
 * stored here — the access token lives in module memory (see lib/api.ts)
 * and the refresh token in an httpOnly cookie, so page JavaScript cannot
 * read either of them.
 */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Session;
      if (s && (s.kind === "customer" || s.kind === "staff")) return { kind: s.kind, role: s.role, permissions: s.permissions, name: s.name };
    }
    // Tolerate the pre-cookie shape ({...tokens, kind}) from older sessions:
    // keep the UI fields, drop the tokens.
    const legacy = window.localStorage.getItem("droovee.session");
    if (legacy) {
      const s = JSON.parse(legacy) as Session;
      if (s && (s.kind === "customer" || s.kind === "staff")) {
        const ui: Session = { kind: s.kind, role: s.role, permissions: s.permissions, name: s.name };
        window.localStorage.setItem(KEY, JSON.stringify(ui));
        window.localStorage.removeItem("droovee.session");
        return ui;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s) window.localStorage.setItem(KEY, JSON.stringify({ kind: s.kind, role: s.role, permissions: s.permissions, name: s.name }));
  else {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem("droovee.session");
  }
}
