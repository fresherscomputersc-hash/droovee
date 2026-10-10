import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { verifyAccess } from "../lib/tokens";
import { accessFromReq } from "../lib/cookies";
import { CustomerModel, StaffModel } from "../models";
import { hasPermission, Permission, StaffRole } from "../lib/permissions";

export interface Principal {
  id: string;
  kind: "customer" | "staff";
  role?: StaffRole;
}

declare module "express-serve-static-core" {
  interface Request {
    principal?: Principal;
    requestId?: string;
  }
}

/**
 * Authenticates the bearer token (or the httpOnly access cookie) and reloads
 * the subject from the database on every request.
 * Disabled accounts, role changes AND token-version bumps take effect
 * immediately: a token carrying a stale version is rejected even before expiry.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : accessFromReq(req);
  if (!token) return next(new AppError(401, "UNAUTHENTICATED", "Sign in required."));
  let claims;
  try {
    claims = verifyAccess(token);
  } catch {
    return next(new AppError(401, "UNAUTHENTICATED", "Session is invalid or expired."));
  }
  try {
    if (claims.kind === "customer") {
      const c = await CustomerModel.findById(claims.sub).lean();
      if (!c || !c.active || (claims.v ?? 0) !== (c.tokenVersion ?? 0)) {
        return next(new AppError(401, "UNAUTHENTICATED", "Session is invalid."));
      }
      req.principal = { id: String(c._id), kind: "customer" };
    } else {
      const s = await StaffModel.findById(claims.sub).lean();
      if (!s || !s.active || (claims.v ?? 0) !== (s.tokenVersion ?? 0)) {
        return next(new AppError(401, "UNAUTHENTICATED", "Session is invalid."));
      }
      req.principal = { id: String(s._id), kind: "staff", role: s.role as StaffRole };
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireCustomer(req: Request, _res: Response, next: NextFunction) {
  if (req.principal?.kind !== "customer") return next(new AppError(403, "FORBIDDEN", "Customer account required."));
  next();
}

export function requirePermission(perm: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const p = req.principal;
    if (!p || p.kind !== "staff" || !p.role) return next(new AppError(403, "FORBIDDEN", "Staff account required."));
    if (!hasPermission(p.role, perm)) return next(new AppError(403, "FORBIDDEN", "You do not have permission for this action."));
    next();
  };
}
