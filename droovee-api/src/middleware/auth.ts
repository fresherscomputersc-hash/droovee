import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../lib/errors";
import { verifyAccess } from "../lib/tokens";
import { accessFromReq, driverAccessFromReq } from "../lib/cookies";
import { CustomerModel, DriverModel, StaffModel } from "../models";
import { hasPermission, Permission, StaffRole } from "../lib/permissions";

export interface Principal {
  id: string;
  kind: "customer" | "staff";
  role?: StaffRole;
}

/** Authenticated driver, derived from the signed driver session (never from client input). */
export interface DriverPrincipal {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
}

declare module "express-serve-static-core" {
  interface Request {
    principal?: Principal;
    driver?: DriverPrincipal;
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
  // Driver tokens are only valid on the driver portal routes.
  if (claims.kind !== "customer" && claims.kind !== "staff") {
    return next(new AppError(401, "UNAUTHENTICATED", "Session is invalid."));
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

/**
 * Authenticates a driver portal session. Only tokens with kind "driver" are
 * accepted; the driver is reloaded from the DB so deactivation and PIN resets
 * (tokenVersion bump) take effect immediately. The driver id always comes from
 * this session, never from the request body/query.
 */
export async function authenticateDriver(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : driverAccessFromReq(req);
  if (!token) return next(new AppError(401, "UNAUTHENTICATED", "Driver sign-in required."));
  let claims;
  try {
    claims = verifyAccess(token);
  } catch {
    return next(new AppError(401, "UNAUTHENTICATED", "Driver session is invalid or expired."));
  }
  if (claims.kind !== "driver" || !Types.ObjectId.isValid(claims.sub)) {
    return next(new AppError(401, "UNAUTHENTICATED", "Driver session is invalid or expired."));
  }
  try {
    const d = await DriverModel.findById(claims.sub).lean();
    if (!d || (claims.v ?? 0) !== (d.tokenVersion ?? 0)) {
      return next(new AppError(401, "UNAUTHENTICATED", "Driver session is invalid."));
    }
    if (d.employmentStatus !== "active") {
      return next(new AppError(403, "FORBIDDEN", "Driver account is not active. Contact dispatch."));
    }
    req.driver = { id: String(d._id), employeeCode: d.employeeCode, name: d.name, phone: d.phone };
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
