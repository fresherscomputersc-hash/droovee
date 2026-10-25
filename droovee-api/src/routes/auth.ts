import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { CustomerModel, StaffModel } from "../models";
import { AppError } from "../lib/errors";
import { normalisePhone } from "../lib/ids";
import { signAccess, issueRefresh, rotateRefresh, revokeRefresh, hmac, safeEqualHex } from "../lib/tokens";
import { requestOtp, verifyOtp } from "../services/otp";
import { authenticate } from "../middleware/auth";
import { validate } from "../lib/validate";
import { audit } from "../lib/audit";
import { config } from "../config";
import { sendMail, welcomeEmail } from "../services/mail";
import { ensureReferralCode } from "../services/growth";
import { setAuthCookies, clearAuthCookies, refreshFromReq } from "../lib/cookies";
import { loginLimiter } from "../lib/rateLimit";
import { passwordIssues } from "../lib/password";
import { ROLE_PERMISSIONS, StaffRole } from "../lib/permissions";

const otpOff = () => {
  if (!config.otpEnabled) throw new AppError(404, "NOT_FOUND", "OTP sign-in is not enabled.");
};

export const authRouter = Router();

/** Public capability flag so sign-in/booking forms only show OTP when it is actually available. */
authRouter.get("/otp/status", (_req, res) => {
  res.json({ enabled: config.otpEnabled });
});

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

const otpRequestSchema = z.object({ phone: phoneField, purpose: z.enum(["login", "register", "guest_booking"]) });

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
  await ensureReferralCode(customer._id as Types.ObjectId);
  if (customer.email) {
    const welcome = welcomeEmail({ name: customer.name, email: customer.email });
    sendMail(customer.email, welcome.subject, welcome.text, welcome.html).catch(() => {});
  }
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

authRouter.post("/customer/login-otp", loginLimiter(), validate(otpLoginSchema), async (req, res) => {
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

/** Forgot password: email a reset link (SMTP). Generic response so accounts can't be enumerated. */
const forgotSchema = z.object({
  email: z.email().trim().toLowerCase().optional(),
  phone: z.string().trim().optional(),
});
authRouter.post("/customer/forgot-password", validate(forgotSchema), async (req, res) => {
  const b = req.body as z.infer<typeof forgotSchema>;
  if (!b.email && !b.phone) {
    throw new AppError(400, "VALIDATION_ERROR", "Enter your email or mobile number.", { email: "required" });
  }
  const phone = b.phone ? normalisePhone(b.phone) : null;
  const customer = b.email
    ? await CustomerModel.findOne({ email: b.email })
    : phone
      ? await CustomerModel.findOne({ phone })
      : null;
  // Always respond the same way; only send mail when there is somewhere to send it.
  if (customer && customer.active && customer.email) {
    const token = randomBytes(32).toString("hex");
    customer.passwordResetTokenHash = hmac(`reset|${token}`);
    customer.passwordResetExpiresAt = new Date(Date.now() + 30 * 60_000);
    await customer.save();
    const link = `${config.webUrl}/reset-password?token=${token}`;
    const sent = await sendMail(
      customer.email,
      "Reset your Droovee password",
      [`Hi ${customer.name},`, ``, `Reset your password with this link (valid 30 minutes):`, link, ``, `If you didn't ask for this, ignore this email.`, `— Team Droovee`].join("\n"),
    );
    await audit({ actorId: String(customer._id), actorKind: "customer", action: "customer.password_reset_requested", entityType: "Customer", entityId: String(customer._id), after: { emailed: sent } });
    // Dev only: surface the link when no SMTP is configured and never in production.
    if (!sent && config.env !== "production") {
      return res.json({ message: "If an account exists for these details, a reset link has been sent.", debugLink: link });
    }
  }
  res.json({ message: "If an account exists for these details, a reset link has been sent." });
});

const resetSchema = z.object({
  token: z.string().min(32).max(256),
  password: customerPassword,
});
authRouter.post("/customer/reset-password", validate(resetSchema), async (req, res) => {
  const b = req.body as z.infer<typeof resetSchema>;
  const hash = hmac(`reset|${b.token}`);
  const customer = await CustomerModel.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash");
  if (!customer || !customer.active || !customer.passwordResetTokenHash || !safeEqualHex(customer.passwordResetTokenHash, hash)) {
    throw new AppError(400, "VALIDATION_ERROR", "This reset link is invalid or has expired. Request a new one.", { token: "invalid" });
  }
  customer.passwordHash = await bcrypt.hash(b.password, 12);
  customer.passwordResetTokenHash = undefined;
  customer.passwordResetExpiresAt = undefined;
  customer.tokenVersion = (customer.tokenVersion ?? 0) + 1; // sign out everywhere
  await customer.save();
  await audit({ actorId: String(customer._id), actorKind: "customer", action: "customer.password_reset", entityType: "Customer", entityId: String(customer._id) });
  res.json({ message: "Password updated. Please sign in with your new password." });
});

authRouter.get("/me", authenticate, async (req, res) => {
  const p = req.principal!;
  if (p.kind === "customer") {
    const c = await CustomerModel.findById(p.id).lean();
    let referralCode = (c as { referralCode?: string } | null)?.referralCode;
    if (c && !referralCode) {
      try {
        referralCode = await ensureReferralCode(new Types.ObjectId(p.id));
      } catch {
        referralCode = undefined;
      }
    }
    return res.json({ kind: "customer", id: p.id, name: c?.name, phone: c?.phone, phoneVerified: c?.phoneVerified, referralCode });
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
