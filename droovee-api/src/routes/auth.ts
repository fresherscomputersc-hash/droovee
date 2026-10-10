import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { CustomerModel, StaffModel } from "../models";
import { AppError } from "../lib/errors";
import { normalisePhone } from "../lib/ids";
import { signAccess, issueRefresh, rotateRefresh, revokeRefresh } from "../lib/tokens";
import { requestOtp, verifyOtp } from "../services/otp";
import { authenticate } from "../middleware/auth";
import { validate } from "../lib/validate";
import { audit } from "../lib/audit";
import { config } from "../config";
import { setAuthCookies, clearAuthCookies, refreshFromReq } from "../lib/cookies";
import { loginLimiter } from "../lib/rateLimit";
import { passwordIssues } from "../lib/password";
import { ROLE_PERMISSIONS, StaffRole } from "../lib/permissions";

const otpOff = () => {
  if (!config.otpEnabled) throw new AppError(404, "NOT_FOUND", "OTP sign-in is not enabled.");
};

export const authRouter = Router();

const phoneField = z.string().transform((v, ctx) => {
  const n = normalisePhone(v);
  if (!n) ctx.addIssue({ code: "custom", message: "Enter a valid Indian mobile number." });
  return n ?? "";
});
/** Customer passwords: 10+ chars, blocklisted guesses rejected, 2+ character classes. */
const customerPassword = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128)
  .superRefine((v, ctx) => {
    const issue = passwordIssues(v, 10, 2);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  });
const otpCode = z.string().regex(/^\d{6}$/, "Enter the 6-digit code.");

const otpRequestSchema = z.object({ phone: phoneField, purpose: z.enum(["login", "register"]) });

authRouter.post("/otp/request", validate(otpRequestSchema), async (req, res) => {
  otpOff();
  const body = req.body as z.infer<typeof otpRequestSchema>;
  res.json(await requestOtp(body.phone, body.purpose));
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneField,
  password: customerPassword,
  otp: otpCode.optional(),
  email: z.email().optional(),
});

/** Registration requires a verified mobile number (OTP) and sets a password for later login. */
authRouter.post("/customer/register", validate(registerSchema), async (req, res) => {
  const b = req.body as z.infer<typeof registerSchema>;
  if (config.otpEnabled) {
    if (!b.otp) throw new AppError(400, "VALIDATION_ERROR", "Enter the 6-digit code.", { otp: "required" });
    await verifyOtp(b.phone, "register", b.otp);
  }
  const exists = await CustomerModel.exists({ $or: [{ phone: b.phone }, ...(b.email ? [{ email: b.email }] : [])] });
  if (exists) throw new AppError(409, "CONFLICT", "An account already exists for this number or email.");
  const passwordHash = await bcrypt.hash(b.password, 12);
  const customer = await CustomerModel.create({
    name: b.name,
    phone: b.phone,
    email: b.email,
    passwordHash,
    phoneVerified: config.otpEnabled,
  });
  await audit({ actorId: String(customer._id), actorKind: "customer", action: "customer.register", entityType: "Customer", entityId: String(customer._id) });
  const session = await sessionFor(String(customer._id), "customer", undefined, customer.tokenVersion ?? 0);
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.status(201).json(session);
});

const passwordLoginSchema = z.object({ phone: phoneField, password: z.string().min(1) });

authRouter.post("/customer/login", loginLimiter(), validate(passwordLoginSchema), async (req, res) => {
  const b = req.body as z.infer<typeof passwordLoginSchema>;
  const c = await CustomerModel.findOne({ phone: b.phone }).select("+passwordHash");
  // Constant-ish failure path: always run bcrypt to avoid timing leaks on account existence.
  const hash = c?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(b.password, hash);
  if (!c || !c.passwordHash || !ok || !c.active) throw new AppError(401, "UNAUTHENTICATED", "Phone number or password is incorrect.");
  const session = await sessionFor(String(c._id), "customer", undefined, c.tokenVersion ?? 0);
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json(session);
});

const otpLoginSchema = z.object({ phone: phoneField, otp: otpCode });

authRouter.post("/customer/login-otp", validate(otpLoginSchema), async (req, res) => {
  otpOff();
  const b = req.body as z.infer<typeof otpLoginSchema>;
  await verifyOtp(b.phone, "login", b.otp);
  const c = await CustomerModel.findOne({ phone: b.phone });
  if (!c || !c.active) throw new AppError(404, "NOT_FOUND", "No account for this number. Please register.");
  c.phoneVerified = true;
  await c.save();
  const session = await sessionFor(String(c._id), "customer", undefined, c.tokenVersion ?? 0);
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json(session);
});

const staffLoginSchema = z.object({ email: z.email(), password: z.string().min(1) });

authRouter.post("/staff/login", loginLimiter(), validate(staffLoginSchema), async (req, res) => {
  const b = req.body as z.infer<typeof staffLoginSchema>;
  const s = await StaffModel.findOne({ email: b.email.toLowerCase() }).select("+passwordHash");
  const hash = s?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(b.password, hash);
  if (!s || !ok || !s.active) throw new AppError(401, "UNAUTHENTICATED", "Email or password is incorrect.");
  const session = await sessionFor(String(s._id), "staff", s.role, s.tokenVersion ?? 0);
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json(session);
});

const refreshSchema = z.object({ refreshToken: z.string().min(20).optional() });

authRouter.post("/refresh", validate(refreshSchema), async (req, res) => {
  // Prefer the httpOnly cookie; the body token exists for non-browser clients.
  const body = req.body as z.infer<typeof refreshSchema>;
  const refreshToken = body.refreshToken ?? refreshFromReq(req);
  if (!refreshToken) throw new AppError(401, "UNAUTHENTICATED", "Session has expired. Sign in again.");
  const rotated = await rotateRefresh(refreshToken);
  if (!rotated.ok) {
    clearAuthCookies(res);
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      rotated.reused ? "Suspicious activity on your session. Sign in again." : "Session has expired. Sign in again.",
    );
  }
  const access = signAccess({ sub: String(rotated.subjectId), kind: rotated.kind, v: rotated.version });
  setAuthCookies(res, access, rotated.refresh);
  res.json({ accessToken: access, refreshToken: rotated.refresh });
});

authRouter.post("/logout", validate(refreshSchema), async (req, res) => {
  const body = req.body as z.infer<typeof refreshSchema>;
  const refreshToken = body.refreshToken ?? refreshFromReq(req);
  if (refreshToken) await revokeRefresh(refreshToken);
  clearAuthCookies(res);
  res.status(204).end();
});

authRouter.get("/me", authenticate, async (req, res) => {
  const p = req.principal!;
  if (p.kind === "customer") {
    const c = await CustomerModel.findById(p.id).lean();
    return res.json({ kind: "customer", id: p.id, name: c?.name, phone: c?.phone, phoneVerified: c?.phoneVerified });
  }
  const s = await StaffModel.findById(p.id).lean();
  return res.json({ kind: "staff", id: p.id, name: s?.name, email: s?.email, role: s?.role, permissions: [...(ROLE_PERMISSIONS[s?.role as StaffRole] ?? [])] });
});

async function sessionFor(id: string, kind: "customer" | "staff", role?: string, version = 0) {
  const { Types } = await import("mongoose");
  const accessToken = signAccess({ sub: id, kind, v: version });
  const refreshToken = await issueRefresh(new Types.ObjectId(id), kind);
  const permissions = kind === "staff" && role ? [...ROLE_PERMISSIONS[role as StaffRole]] : undefined;
  return { accessToken, refreshToken, kind, role, permissions, expiresInSeconds: config.accessTokenTtlSeconds };
}
