import jwt from "jsonwebtoken";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { config } from "../config";
import { CustomerModel, SessionModel, StaffModel } from "../models";
import { audit } from "./audit";
import { Types } from "mongoose";

export type SubjectKind = "customer" | "staff";
/** Access tokens may also be issued to drivers (portal only; no refresh tokens). */
export type AccessKind = SubjectKind | "driver";

export interface AccessClaims {
  sub: string;
  kind: AccessKind;
  /** Must match the subject's tokenVersion (bumped on disable/role change). Absent = 0 (pre-version tokens). */
  v?: number;
}

/** HMAC with a server-side pepper. Used for OTPs and refresh tokens; never store the raw value. */
export function hmac(value: string): string {
  // config.tokenPepper throws if TOKEN_PEPPER is missing — fail closed, no fallback.
  return createHmac("sha256", config.tokenPepper).update(value).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function signAccess(claims: AccessClaims, ttlSeconds?: number): string {
  // config.jwtAccessSecret throws if JWT_ACCESS_SECRET is missing — fail closed, no fallback.
  return jwt.sign(claims, config.jwtAccessSecret, {
    expiresIn: ttlSeconds ?? config.accessTokenTtlSeconds,
    algorithm: "HS256",
  });
}

export function verifyAccess(token: string): AccessClaims {
  const payload = jwt.verify(token, config.jwtAccessSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
  return { sub: String(payload.sub), kind: payload.kind as AccessKind, v: typeof payload.v === "number" ? payload.v : undefined };
}

/** Issues a new opaque refresh token and stores only its hash. */
export async function issueRefresh(subjectId: Types.ObjectId, kind: SubjectKind, familyId?: Types.ObjectId): Promise<string> {
  const raw = randomBytes(48).toString("base64url");
  await SessionModel.create({
    subjectId,
    subjectKind: kind,
    tokenHash: hmac(raw),
    familyId: familyId ?? new Types.ObjectId(),
    expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 86_400_000),
  });
  return raw;
}

export type RotateResult =
  | { ok: true; subjectId: Types.ObjectId; kind: SubjectKind; version: number; refresh: string }
  | { ok: false; reused: boolean };

/**
 * Rotates a refresh token: the old one is revoked and a new one issued in the
 * same family. Also enforces subject active status and returns the current
 * token version (fix: disabled subjects can no longer refresh forever).
 *
 * Reuse of an already-revoked token signals possible theft: the whole family
 * is revoked and the caller must force re-login. A revocation younger than
 * REUSE_GRACE_MS is treated as a benign double-submit (mobile double-tap).
 */
const reuseGraceMs = (): number => Number(process.env.REFRESH_REUSE_GRACE_MS ?? 10_000);

export async function rotateRefresh(raw: string): Promise<RotateResult> {
  const session = await SessionModel.findOne({ tokenHash: hmac(raw) });
  if (!session || session.expiresAt <= new Date()) return { ok: false, reused: false };

  if (session.revokedAt) {
    const ageMs = Date.now() - session.revokedAt.getTime();
    if (ageMs > reuseGraceMs() && session.familyId) {
      await SessionModel.updateMany(
        { familyId: session.familyId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
      await audit({
        actorId: String(session.subjectId),
        actorKind: session.subjectKind,
        action: "auth.refresh_reuse",
        entityType: "Session",
        entityId: String(session._id),
        reason: "Revoked refresh token was presented; family revoked.",
      });
      return { ok: false, reused: true };
    }
    return { ok: false, reused: false };
  }

  const Subject = session.subjectKind === "customer" ? CustomerModel : StaffModel;
  const subject =
    session.subjectKind === "customer"
      ? await CustomerModel.findById(session.subjectId).select("active tokenVersion").lean()
      : await StaffModel.findById(session.subjectId).select("active tokenVersion").lean();
  if (!subject || !subject.active) return { ok: false, reused: false };

  // Atomic claim: concurrent use of the same token resolves to exactly one winner.
  const claimed = await SessionModel.findOneAndUpdate(
    { _id: session._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
    { returnDocument: "before" },
  );
  if (!claimed) return { ok: false, reused: false };

  const refresh = await issueRefresh(session.subjectId, session.subjectKind, session.familyId ?? undefined);
  return { subjectId: session.subjectId, kind: session.subjectKind, version: subject.tokenVersion ?? 0, refresh, ok: true };
}

export async function revokeRefresh(raw: string): Promise<void> {
  await SessionModel.updateOne({ tokenHash: hmac(raw), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

/** Revokes every session of a subject (used on disable). */
export async function revokeAllSessions(subjectId: Types.ObjectId): Promise<void> {
  await SessionModel.updateMany({ subjectId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}
