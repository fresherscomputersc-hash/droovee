import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { randomInt } from "crypto";
import {
  BookingModel,
  DriverModel,
  AvailabilityBlockModel,
  CustomerModel,
  PaymentModel,
  CouponModel,
  SettingsModel,
  AuditLogModel,
  StaffModel,
  TicketModel,
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_CHANNELS,
} from "../models";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate, validateQuery } from "../lib/validate";
import { AppError } from "../lib/errors";
import { audit } from "../lib/audit";
import { maskPhone } from "../lib/ids";
import { canTransition, BookingStatus, BOOKING_STATUSES } from "../domain/status";
import { getActiveSettings } from "../services/settings";
import { assignDriver } from "../services/assignment";
import { revokeAllSessions } from "../lib/tokens";
import { passwordIssues } from "../lib/password";
import { listUnconfirmed } from "../domain/settings";
import { hasPermission, STAFF_ROLES, StaffRole } from "../lib/permissions";

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use((req, _res, next) => {
  if (req.principal?.kind !== "staff") return next(new AppError(403, "FORBIDDEN", "Staff account required."));
  next();
});

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid id");
const idParam = (req: { params: Record<string, any> }) => {
  if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(404, "NOT_FOUND", "Not found.");
  return String(req.params.id);
};

/** Maps Mongo duplicate-key errors to 409 + field error instead of 500. */
function orDup409(e: unknown, field: string, message: string): never {
  if ((e as { code?: number }).code === 11000) {
    throw new AppError(409, "CONFLICT", message, { [field]: "already_exists" });
  }
  throw e;
}

// ---------- Dashboard summary ----------
adminRouter.get("/dashboard", requirePermission("bookings:read"), async (_req, res) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  // Asia/Kolkata day boundary: 00:00 IST = 18:30 UTC previous day.
  const istStart = new Date(Date.now() + 330 * 60_000);
  istStart.setUTCHours(0, 0, 0, 0);
  const dayStart = new Date(istStart.getTime() - 330 * 60_000);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const [todayBookings, completedToday, pendingAssignment, pendingReview, cancelRequests] = await Promise.all([
    BookingModel.countDocuments({ scheduledStart: { $gte: dayStart, $lt: dayEnd } }),
    BookingModel.countDocuments({ status: "completed", updatedAt: { $gte: dayStart, $lt: dayEnd } }),
    BookingModel.countDocuments({ status: "confirmed" }),
    BookingModel.countDocuments({ status: "requested" }),
    BookingModel.countDocuments({ "cancellation.requestedAt": { $exists: true }, status: { $nin: ["cancelled", "completed"] } }),
  ]);
  const drivers = await DriverModel.find({ employmentStatus: "active" }).select("_id").lean();
  res.json({
    timezone: "Asia/Kolkata",
    today: { bookings: todayBookings, completed: completedToday },
    pending: { review: pendingReview, assignment: pendingAssignment, cancellationRequests: cancelRequests },
    activeDrivers: drivers.length,
  });
});

// ---------- Bookings ----------
const listQuery = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  bookingNumber: z.string().trim().max(20).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  customerPhone: z.string().trim().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).default(1),
});

/** Paged envelope: { items, page, limit, total }. Page beyond total returns []. */
function pageOf<T>(items: T[], total: number, page: number, limit: number) {
  return { items, page, limit, total };
}

adminRouter.get("/bookings", requirePermission("bookings:read"), validateQuery(listQuery), async (req, res) => {
  const q = (req as unknown as { validatedQuery: z.infer<typeof listQuery> }).validatedQuery;
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.bookingNumber) filter.bookingNumber = q.bookingNumber.toUpperCase();
  if (q.from || q.to) filter.scheduledStart = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
  if (q.customerPhone) filter["customerSnapshot.phone"] = { $regex: q.customerPhone.replace(/\D/g, "") + "$" };
  const [items, total] = await Promise.all([
    BookingModel.find(filter).sort({ scheduledStart: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    BookingModel.countDocuments(filter),
  ]);
  res.json({ ...pageOf(items.map((b) => adminBookingView(b, { maskPhone: true })), total, q.page, q.limit) });
});

adminRouter.get("/bookings/:id", requirePermission("bookings:read"), async (req, res) => {
  const b = await BookingModel.findById(idParam(req)).lean();
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  const driver = b.driverId ? await DriverModel.findById(b.driverId).select("name phone employeeCode").lean() : null;
  res.json({ ...adminBookingView(b), driver });
});

function adminBookingView(b: Record<string, any>, opts: { maskPhone?: boolean } = {}) {
  const phone = b.customerSnapshot?.phone as string | undefined;
  return {
    id: String(b._id),
    bookingNumber: b.bookingNumber,
    status: b.status,
    serviceType: b.serviceType,
    customer: b.customerSnapshot ? { ...b.customerSnapshot, phone: opts.maskPhone && phone ? maskPhone(phone) : phone } : b.customerSnapshot,
    scheduledStart: b.scheduledStart,
    scheduledEnd: b.scheduledEnd,
    pickup: b.pickup,
    destination: b.destination,
    carModel: b.carModel,
    transmission: b.transmission,
    instructions: b.instructions,
    driverId: b.driverId ? String(b.driverId) : null,
    fareEstimate: b.fareEstimate,
    finalFare: b.finalFare ?? null,
    fareAdjustments: b.fareAdjustments ?? [],
    contactLog: b.contactLog ?? [],
    conflictOverrides: b.conflictOverrides ?? [],
    cancellation: b.cancellation ?? null,
    statusHistory: b.statusHistory ?? [],
    version: b.version,
    couponCode: b.couponCode ?? null,
    createdAt: b.createdAt,
  };
}

const assignSchema = z.object({
  driverId: objectId,
  /** Required: stale views must reload instead of silently overwriting. */
  expectedVersion: z.number().int(),
  overrideReason: z.string().trim().min(5).max(500).optional(),
});

adminRouter.patch("/bookings/:id/assign", requirePermission("bookings:assign"), validate(assignSchema), async (req, res) => {
  const body = req.body as z.infer<typeof assignSchema>;
  if (body.overrideReason && !hasPermission(req.principal!.role as StaffRole, "conflict:override")) {
    throw new AppError(403, "FORBIDDEN", "Your role cannot override driver conflicts.");
  }
  const result = await assignDriver({
    bookingId: idParam(req),
    driverId: body.driverId,
    actorId: req.principal!.id,
    actorRole: req.principal!.role!,
    requestId: req.requestId,
    expectedVersion: body.expectedVersion,
    overrideReason: body.overrideReason,
  });
  res.json(result);
});

const reassignSchema = assignSchema.extend({ reassignReason: z.string().trim().min(5).max(500) });

adminRouter.patch("/bookings/:id/reassign", requirePermission("bookings:reassign"), validate(reassignSchema), async (req, res) => {
  const body = req.body as z.infer<typeof reassignSchema>;
  if (body.overrideReason && !hasPermission(req.principal!.role as StaffRole, "conflict:override")) {
    throw new AppError(403, "FORBIDDEN", "Your role cannot override driver conflicts.");
  }
  const result = await assignDriver({
    bookingId: idParam(req),
    driverId: body.driverId,
    actorId: req.principal!.id,
    actorRole: req.principal!.role!,
    requestId: req.requestId,
    expectedVersion: body.expectedVersion,
    overrideReason: body.overrideReason,
    reassignReason: body.reassignReason,
  });
  res.json(result);
});

const statusSchema = z.object({
  to: z.enum(BOOKING_STATUSES),
  reason: z.string().trim().min(3).max(500).optional(),
  finalFare: z.number().min(0).max(10_00_000).optional(),
  /** Required: stale views must reload instead of silently overwriting. */
  expectedVersion: z.number().int(),
  feeAmount: z.number().min(0).optional(),
  refundAmount: z.number().min(0).optional(),
});

/**
 * Status transitions. Business guards:
 *  - only allowed transitions (domain/status.ts)
 *  - driver_on_the_way requires an assigned driver AND a recorded driver confirmation
 *  - cancelled / rejected / customer_no_show require a reason
 *  - completed requires a final fare (FR-TRIP-03)
 */
adminRouter.patch("/bookings/:id/status", requirePermission("bookings:status"), validate(statusSchema), async (req, res) => {
  const body = req.body as z.infer<typeof statusSchema>;
  const b = await BookingModel.findById(idParam(req));
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  if (body.expectedVersion !== b.version) {
    throw new AppError(409, "CONFLICT", "Booking was changed by someone else. Reload and try again.");
  }
  const from = b.status as BookingStatus;
  const to = body.to as BookingStatus;
  if (!canTransition(from, to)) {
    throw new AppError(409, "CONFLICT", `Status cannot change from ${from} to ${to}.`);
  }
  const fieldErrors: Record<string, string> = {};
  if (to === "driver_on_the_way") {
    if (!b.driverId) fieldErrors.to = "Assign a driver first.";
    else if (!b.contactLog.some((c) => c.result === "confirmed")) fieldErrors.to = "Record the driver's confirmation first.";
  }
  if (["cancelled", "rejected", "customer_no_show"].includes(to) && !body.reason) fieldErrors.reason = "A reason is required.";
  if (to === "completed" && body.finalFare === undefined && b.finalFare == null) fieldErrors.finalFare = "Final fare is required to complete a trip.";
  if (Object.keys(fieldErrors).length) throw new AppError(409, "CONFLICT", "This status change is not allowed yet.", fieldErrors);

  const now = new Date();
  b.status = to as typeof b.status;
  // Demoting an assigned booking back to confirmed unassigns the driver;
  // otherwise the list says "confirmed" while a driver is still attached.
  if (from === "driver_assigned" && to === "confirmed") {
    b.driverId = undefined;
  }
  b.statusHistory.push({ from, to, reason: body.reason, actorId: new Types.ObjectId(req.principal!.id), actorKind: "staff", at: now } as never);
  if (body.finalFare !== undefined) {
    const prev = b.finalFare ?? b.fareEstimate?.total ?? null;
    if (prev !== body.finalFare) {
      b.fareAdjustments.push({ from: prev ?? undefined, to: body.finalFare, reason: body.reason ?? "Set at completion", actorId: new Types.ObjectId(req.principal!.id), at: now } as never);
    }
    b.finalFare = body.finalFare;
  }
  if (to === "cancelled" || to === "customer_no_show" || to === "rejected") {
    b.cancellation = {
      ...(b.cancellation ?? {}),
      reason: body.reason,
      feeAmount: body.feeAmount,
      refundAmount: body.refundAmount,
      decidedBy: new Types.ObjectId(req.principal!.id),
      decidedAt: now,
    } as typeof b.cancellation;
  }
  b.version += 1;
  await b.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "booking.status_change",
    entityType: "Booking",
    entityId: String(b._id),
    before: { status: from },
    after: { status: to, finalFare: b.finalFare },
    reason: body.reason,
    requestId: req.requestId,
  });
  res.json({ id: String(b._id), status: b.status, version: b.version });
});

const fareSchema = z.object({
  finalFare: z.number().min(0).max(10_00_000),
  reason: z.string().trim().min(5).max(500),
  /** Required: stale views must reload instead of silently overwriting. */
  expectedVersion: z.number().int(),
});

adminRouter.patch("/bookings/:id/fare", requirePermission("bookings:fare_adjust"), validate(fareSchema), async (req, res) => {
  const body = req.body as z.infer<typeof fareSchema>;
  const b = await BookingModel.findById(idParam(req));
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  if (body.expectedVersion !== b.version) {
    throw new AppError(409, "CONFLICT", "Booking was changed by someone else. Reload and try again.");
  }
  const prev = b.finalFare ?? b.fareEstimate?.total ?? null;
  b.fareAdjustments.push({ from: prev ?? undefined, to: body.finalFare, reason: body.reason, actorId: new Types.ObjectId(req.principal!.id), at: new Date() } as never);
  b.finalFare = body.finalFare;
  b.version += 1;
  await b.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "booking.fare_adjust",
    entityType: "Booking",
    entityId: String(b._id),
    before: { finalFare: prev },
    after: { finalFare: body.finalFare },
    reason: body.reason,
    requestId: req.requestId,
  });
  res.json({ id: String(b._id), finalFare: b.finalFare, version: b.version });
});

const contactSchema = z.object({
  channel: z.enum(["call", "whatsapp"]),
  result: z.enum(["not_contacted", "contacted", "confirmed", "declined", "unreachable"]),
  notes: z.string().trim().max(500).optional(),
  /** Required: stale views must reload instead of silently overwriting. */
  expectedVersion: z.number().int(),
});

adminRouter.post("/bookings/:id/contact-log", requirePermission("contact_log:write"), validate(contactSchema), async (req, res) => {
  const body = req.body as z.infer<typeof contactSchema>;
  const b = await BookingModel.findById(idParam(req));
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  if (body.expectedVersion !== b.version) {
    throw new AppError(409, "CONFLICT", "Booking was changed by someone else. Reload and try again.");
  }
  if (!b.driverId) throw new AppError(409, "CONFLICT", "Assign a driver before logging contact.");
  const { expectedVersion: _v, ...entry } = body;
  b.contactLog.push({ ...entry, actorId: new Types.ObjectId(req.principal!.id), at: new Date() } as never);
  b.version += 1;
  await b.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "booking.contact_log",
    entityType: "Booking",
    entityId: String(b._id),
    after: body,
  });
  res.status(201).json({ contactLog: b.contactLog });
});

const offlinePaymentSchema = z.object({
  amount: z.number().positive().max(10_00_000),
  method: z.literal("cash"),
  reference: z.string().trim().max(120).optional(),
});

/** Records an offline (cash) receipt. Only authorised finance staff (FR-PAY-07). */
adminRouter.post("/bookings/:id/offline-payment", requirePermission("payments:record_offline"), validate(offlinePaymentSchema), async (req, res) => {
  const body = req.body as z.infer<typeof offlinePaymentSchema>;
  const b = await BookingModel.findById(idParam(req)).lean();
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  const payment = await PaymentModel.create({
    bookingId: b._id,
    amount: body.amount,
    method: body.method,
    status: "succeeded",
    receivedBy: new Types.ObjectId(req.principal!.id),
    reference: body.reference,
    recordedAt: new Date(),
  });
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "payment.offline_record",
    entityType: "Payment",
    entityId: String(payment._id),
    after: { bookingId: String(b._id), amount: body.amount, method: body.method },
    reason: body.reference,
  });
  res.status(201).json({ id: String(payment._id), amount: payment.amount, method: payment.method, status: payment.status });
});

// ---------- Drivers ----------
const driverSchema = z.object({
  employeeCode: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(15),
  licenceNumber: z.string().trim().max(40).optional(),
  licenceExpiresAt: z.coerce.date().optional(),
  serviceZones: z.array(z.string().trim().max(60)).max(50).default([]),
});

adminRouter.get("/drivers", requirePermission("drivers:read"), async (_req, res) => {
  const items = await DriverModel.find().sort({ name: 1 }).limit(500).lean();
  res.json({ items });
});

adminRouter.post("/drivers", requirePermission("drivers:write"), validate(driverSchema), async (req, res) => {
  const d = await DriverModel.create(req.body).catch((e) => orDup409(e, "employeeCode", "A driver with this employee code already exists."));
  await audit({ actorId: req.principal!.id, actorKind: "staff", actorRole: req.principal!.role, action: "driver.create", entityType: "Driver", entityId: String(d._id), after: { employeeCode: d.employeeCode } });
  res.status(201).json(d);
});

const driverPatchSchema = driverSchema.partial().extend({
  employmentStatus: z.enum(["active", "inactive", "suspended"]).optional(),
});

adminRouter.patch("/drivers/:id", requirePermission("drivers:write"), validate(driverPatchSchema), async (req, res) => {
  const before = await DriverModel.findById(idParam(req)).lean();
  if (!before) throw new AppError(404, "NOT_FOUND", "Driver not found.");
  const d = await DriverModel.findByIdAndUpdate(before._id, { $set: req.body }, { returnDocument: "after" }).lean();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "driver.update",
    entityType: "Driver",
    entityId: String(before._id),
    before: { employmentStatus: before.employmentStatus },
    after: { employmentStatus: d?.employmentStatus },
  });
  res.json(d);
});

/** Driver schedule: bookings and availability blocks in a window, for the assignment view. */
const scheduleQuery = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((q) => !q.from || !q.to || q.to > q.from, { message: "to must be after from", path: ["to"] });

adminRouter.get("/drivers/:id/schedule", requirePermission("drivers:read"), validateQuery(scheduleQuery), async (req, res) => {
  const id = new Types.ObjectId(idParam(req));
  const q = (req as unknown as { validatedQuery: z.infer<typeof scheduleQuery> }).validatedQuery;
  const from = q.from ?? new Date();
  const to = q.to ?? new Date(from.getTime() + 14 * 86_400_000);
  const [bookings, blocks] = await Promise.all([
    BookingModel.find({ driverId: id, scheduledStart: { $lt: to }, scheduledEnd: { $gt: from } })
      .select("bookingNumber status scheduledStart scheduledEnd serviceType")
      .sort({ scheduledStart: 1 })
      .lean(),
    AvailabilityBlockModel.find({ driverId: id, startAt: { $lt: to }, endAt: { $gt: from } }).sort({ startAt: 1 }).lean(),
  ]);
  res.json({ bookings, blocks });
});

const blockSchema = z
  .object({
    driverId: objectId,
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    type: z.enum(["leave", "unavailable", "shift_off"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.endAt > b.startAt, { message: "endAt must be after startAt", path: ["endAt"] });

/** Creates a leave/unavailable block. Returns existing bookings it overlaps so admin can act. */
adminRouter.post("/availability-blocks", requirePermission("availability:write"), validate(blockSchema), async (req, res) => {
  const body = req.body as z.infer<typeof blockSchema>;
  const driver = await DriverModel.findById(body.driverId).lean();
  if (!driver) throw new AppError(404, "NOT_FOUND", "Driver not found.");
  const { settings } = await getActiveSettings();
  const buf = settings.policy.driverBufferMinutes.value;
  const overlapping = await BookingModel.find({
    driverId: driver._id,
    status: { $nin: ["completed", "cancelled", "rejected", "customer_no_show"] },
    scheduledStart: { $lt: new Date(body.endAt.getTime() + buf * 60_000) },
    scheduledEnd: { $gt: new Date(body.startAt.getTime() - buf * 60_000) },
  })
    .select("bookingNumber scheduledStart scheduledEnd")
    .lean();
  const block = await AvailabilityBlockModel.create({ ...body, createdBy: new Types.ObjectId(req.principal!.id) });
  await audit({ actorId: req.principal!.id, actorKind: "staff", actorRole: req.principal!.role, action: "availability.block_create", entityType: "AvailabilityBlock", entityId: String(block._id), after: body });
  res.status(201).json({
    block,
    warnings: overlapping.map((b) => ({ bookingNumber: b.bookingNumber, start: b.scheduledStart, end: b.scheduledEnd })),
  });
});

// ---------- Customers ----------
const customerQuery = z.object({
  phone: z.string().trim().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
});

adminRouter.get("/customers", requirePermission("customers:read"), validateQuery(customerQuery), async (req, res) => {
  const q = (req as unknown as { validatedQuery: z.infer<typeof customerQuery> }).validatedQuery;
  // Suffix match (consistent with bookings search): "98765" matches numbers ending in it.
  const phone = (q.phone ?? "").replace(/\D/g, "");
  const filter = phone ? { phone: { $regex: phone + "$" } } : {};
  const [items, total] = await Promise.all([
    CustomerModel.find(filter).select("name phone email active createdAt").skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    CustomerModel.countDocuments(filter),
  ]);
  res.json({ ...pageOf(items.map((c) => ({ ...c, phone: maskPhone(c.phone) })), total, q.page, q.limit) });
});

// ---------- Coupons ----------
const couponSchema = z
  .object({
    code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/),
    type: z.enum(["first_hour_price"]),
    value: z.number().min(0).max(100000),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
    usageLimit: z.number().int().min(0).default(0),
    eligibleServices: z.array(z.enum(["hourly", "half_day", "full_day", "monthly_office", "outstation_one_way", "outstation_round_trip", "airport_pickup_drop"])).default([]),
    minAmount: z.number().min(0).default(0),
    /** 0 = reusable, 1 = once per customer (unique redemption record). */
    perCustomerLimit: z.number().int().min(0).max(1).default(0),
    active: z.boolean().default(true),
  })
  .refine((c) => c.validTo > c.validFrom, { message: "validTo must be after validFrom", path: ["validTo"] });

adminRouter.get("/coupons", requirePermission("bookings:read"), async (req, res) => {
  const items = await CouponModel.find().sort({ createdAt: -1 }).limit(200).lean();
  if (hasPermission(req.principal!.role as StaffRole, "coupons:write")) return res.json({ items });
  // Triage view for support/ops readers: code, window and eligibility stay
  // visible, but coupon economics are hidden.
  res.json({
    items: items.map(({ value: _v, usedCount: _u, usageLimit: _l, minAmount: _m, ...rest }) => rest),
  });
});

adminRouter.post("/coupons", requirePermission("coupons:write"), validate(couponSchema), async (req, res) => {
  const body = req.body as z.infer<typeof couponSchema>;
  const c = await CouponModel.create({ ...body, code: body.code.toUpperCase() }).catch((e) => orDup409(e, "code", "A coupon with this code already exists."));
  await audit({ actorId: req.principal!.id, actorKind: "staff", actorRole: req.principal!.role, action: "coupon.create", entityType: "Coupon", entityId: String(c._id), after: { code: c.code, value: c.value } });
  res.status(201).json(c);
});

// ---------- Settings ----------
adminRouter.get("/settings", requirePermission("pricing:write"), async (_req, res) => {
  const { version, settings } = await getActiveSettings();
  res.json({ version, settings, unconfirmed: listUnconfirmed(settings) });
});

const statusEnum = z.enum(["confirmed", "unconfirmed"]);
const settingNumber = (min: number, max: number) =>
  z
    .object({ value: z.number().min(min).max(max), status: statusEnum, note: z.string().max(500).optional() })
    .strict();
const serviceRates = z
  .object({
    basePrice: z.number().min(0).max(10_00_000),
    includedHours: z.number().min(0).max(744),
    perHour: z.number().min(0).max(100_000),
    nightHalt: z.number().min(0).max(100_000).optional(),
    monthly: z.boolean().optional(),
    status: statusEnum,
  })
  .strict();

const settingsSchema = z.object({
  pricing: z
    .object({
      services: z.object({
        hourly: serviceRates,
        half_day: serviceRates,
        full_day: serviceRates,
        monthly_office: serviceRates,
        outstation_one_way: serviceRates,
        outstation_round_trip: serviceRates,
        airport_pickup_drop: serviceRates,
      }),
      additionalHourRate: settingNumber(0, 100_000),
      lateNightSurcharge: settingNumber(0, 100_000),
      lateNightWindow: z.object({
        value: z.object({ startHour: z.number().int().min(0).max(23), endHour: z.number().int().min(0).max(23) }),
        status: statusEnum,
        note: z.string().max(500).optional(),
      }),
      nightHaltRate: settingNumber(0, 100_000),
      combinationRule: z.object({ value: z.enum(["package_plus_extras"]), status: statusEnum, note: z.string().max(500).optional() }),
      currency: z.literal("INR"),
    })
    .strict(),
  policy: z
    .object({
      minLeadTimeMinutes: settingNumber(0, 43_200),
      driverBufferMinutes: settingNumber(0, 1_440),
      cancellationFee: settingNumber(0, 10_00_000),
      cancellationWindowMinutes: settingNumber(0, 43_200),
      paymentTiming: z.object({
        value: z.enum(["at_booking", "before_trip", "after_trip", "advance_then_balance"]),
        status: statusEnum,
        note: z.string().max(500).optional(),
      }),
      advancePercent: settingNumber(0, 100),
      customerCompletionConfirmation: z.object({ value: z.boolean(), status: statusEnum, note: z.string().max(500).optional() }),
    })
    .strict(),
  changeReason: z.string().trim().min(5).max(500),
  /** Optimistic lock: must equal the active version, else someone else saved first. */
  expectedVersion: z.number().int(),
});

/**
 * Saves a new settings version. Confirmed values can be changed by owner only.
 * Unconfirmed items must be marked "confirmed" by the client before launch (checked by the launch gate).
 */
adminRouter.put("/settings", requirePermission("pricing:write"), validate(settingsSchema), async (req, res) => {
  const body = req.body as z.infer<typeof settingsSchema>;
  const current = await getActiveSettings();
  if (body.expectedVersion !== current.version) {
    throw new AppError(409, "CONFLICT", "Settings were changed by someone else. Reload and try again.");
  }
  const version = current.version + 1;
  await SettingsModel.updateMany({ active: true }, { $set: { active: false } });
  await SettingsModel.create({ version, active: true, pricing: body.pricing, policy: body.policy, changedBy: new Types.ObjectId(req.principal!.id), changeReason: body.changeReason });
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "settings.update",
    entityType: "Settings",
    entityId: String(version),
    before: { version: current.version },
    after: { version },
    reason: body.changeReason,
  });
  res.status(201).json({ version });
});

// ---------- Staff accounts ----------
const staffCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  /** Staff passwords: 12+ chars, 3+ character classes, blocklisted guesses rejected. */
  password: z
    .string()
    .min(12, "Staff password must be at least 12 characters.")
    .max(128)
    .superRefine((v, ctx) => {
      const issue = passwordIssues(v, 12, 3);
      if (issue) ctx.addIssue({ code: "custom", message: issue });
    }),
  role: z.enum(STAFF_ROLES),
});

adminRouter.post("/staff", requirePermission("staff:manage"), validate(staffCreateSchema), async (req, res) => {
  const b = req.body as z.infer<typeof staffCreateSchema>;
  const s = await StaffModel.create({ name: b.name, email: b.email, role: b.role, passwordHash: await bcrypt.hash(b.password, 12) }).catch((e) =>
    orDup409(e, "email", "A staff account with this email already exists."),
  );
  await audit({ actorId: req.principal!.id, actorKind: "staff", actorRole: req.principal!.role, action: "staff.create", entityType: "Staff", entityId: String(s._id), after: { role: s.role, email: s.email } });
  res.status(201).json({ id: String(s._id), email: s.email, role: s.role, active: s.active });
});

const staffPatchSchema = z.object({ role: z.enum(STAFF_ROLES).optional(), active: z.boolean().optional() });

/** Disabling a staff account takes effect on their next request (authenticate reloads the account). */
adminRouter.patch("/staff/:id", requirePermission("staff:manage"), validate(staffPatchSchema), async (req, res) => {
  const before = await StaffModel.findById(idParam(req)).lean();
  if (!before) throw new AppError(404, "NOT_FOUND", "Staff not found.");
  if (String(before._id) === req.principal!.id && req.body.active === false) {
    throw new AppError(409, "CONFLICT", "You cannot disable your own account.");
  }
  const update = { ...req.body } as Record<string, unknown>;
  // Role/active changes invalidate outstanding tokens immediately AND kill
  // refresh chains, so a terminated staff member is locked out at once.
  const securityChange =
    (update.role !== undefined && update.role !== before.role) || (update.active !== undefined && update.active !== before.active);
  if (securityChange) update.tokenVersion = (before.tokenVersion ?? 0) + 1;
  const s = await StaffModel.findByIdAndUpdate(before._id, { $set: update }, { returnDocument: "after" }).lean();
  if (securityChange) await revokeAllSessions(before._id);
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "staff.update",
    entityType: "Staff",
    entityId: String(before._id),
    before: { role: before.role, active: before.active },
    after: { role: s?.role, active: s?.active },
  });
  res.json({ id: String(before._id), role: s?.role, active: s?.active });
});

// ---------- Staff list ----------
adminRouter.get("/staff", requirePermission("staff:manage"), async (_req, res) => {
  res.json({ items: await StaffModel.find().select("name email role active createdAt").sort({ createdAt: 1 }).lean() });
});

// ---------- Availability blocks list ----------
adminRouter.get("/availability-blocks", requirePermission("drivers:read"), async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.driverId && Types.ObjectId.isValid(String(req.query.driverId))) filter.driverId = String(req.query.driverId);
  const items = await AvailabilityBlockModel.find(filter).sort({ startAt: -1 }).limit(300).lean();
  res.json({ items });
});

// ---------- Driver options for one booking (eligibility + conflicts) ----------
adminRouter.get("/bookings/:id/driver-options", requirePermission("drivers:read"), async (req, res) => {
  const b = await BookingModel.findById(idParam(req)).lean();
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  const { settings } = await getActiveSettings();
  const buffer = settings.policy.driverBufferMinutes.value;
  const drivers = await DriverModel.find({ employmentStatus: "active" }).sort({ name: 1 }).lean();
  const out = [];
  for (const d of drivers) {
    const bookings = await BookingModel.find({
      driverId: d._id,
      _id: { $ne: b._id },
      status: { $nin: ["completed", "cancelled", "rejected", "customer_no_show"] },
      scheduledStart: { $lt: new Date(b.scheduledEnd.getTime() + buffer * 60_000) },
      scheduledEnd: { $gt: new Date(b.scheduledStart.getTime() - buffer * 60_000) },
    }).select("bookingNumber scheduledStart scheduledEnd").lean();
    const blocks = await AvailabilityBlockModel.find({
      driverId: d._id,
      startAt: { $lt: new Date(b.scheduledEnd.getTime() + buffer * 60_000) },
      endAt: { $gt: new Date(b.scheduledStart.getTime() - buffer * 60_000) },
    }).lean();
    const conflicts = [
      ...bookings.map((x) => ({ kind: "booking", ref: x.bookingNumber, start: x.scheduledStart, end: x.scheduledEnd })),
      ...blocks.map((x) => ({ kind: "availability_block", ref: x.reason || x.type, start: x.startAt, end: x.endAt })),
    ];
    out.push({ id: String(d._id), name: d.name, employeeCode: d.employeeCode, phone: d.phone, conflicts, available: conflicts.length === 0 });
  }
  res.json({ items: out, currentDriverId: b.driverId ? String(b.driverId) : null });
});

// ---------- Payments for a booking ----------
adminRouter.get("/bookings/:id/payments", requirePermission("bookings:read"), async (req, res) => {
  const items = await PaymentModel.find({ bookingId: idParam(req) }).sort({ recordedAt: -1 }).lean();
  res.json({ items });
});

// ---------- Reports ----------
const reportQuery = z
  .object({
    from: z.coerce.date().default(new Date(Date.now() - 30 * 86_400_000)),
    to: z.coerce.date().default(new Date(Date.now() + 86_400_000)),
  })
  .refine((q) => q.from < q.to, { message: "from must be before to", path: ["from"] })
  .refine((q) => q.to.getTime() - q.from.getTime() <= 366 * 86_400_000, {
    message: "Report window is at most 366 days.",
    path: ["to"],
  });

adminRouter.get("/reports/bookings", requirePermission("reports:read"), validateQuery(reportQuery), async (req, res) => {
  const { from, to } = (req as unknown as { validatedQuery: z.infer<typeof reportQuery> }).validatedQuery;
  const byStatus = await BookingModel.aggregate([
    { $match: { scheduledStart: { $gte: from, $lt: to } } },
    { $group: { _id: "$status", count: { $sum: 1 }, estimated: { $sum: "$fareEstimate.total" }, final: { $sum: { $ifNull: ["$finalFare", 0] } } } },
    { $sort: { count: -1 } },
  ]);
  const byService = await BookingModel.aggregate([
    { $match: { scheduledStart: { $gte: from, $lt: to } } },
    { $group: { _id: "$serviceType", count: { $sum: 1 }, revenue: { $sum: { $ifNull: ["$finalFare", "$fareEstimate.total"] } } } },
    { $sort: { count: -1 } },
  ]);
  const payments = await PaymentModel.aggregate([
    { $match: { recordedAt: { $gte: from, $lt: to } } },
    { $group: { _id: { method: "$method", status: "$status" }, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  res.json({ from, to, byStatus, byService, payments, currency: "INR" });
});

// ---------- Support tickets ----------
const ticketCreate = z.object({
  category: z.enum(TICKET_CATEGORIES),
  channel: z.enum(TICKET_CHANNELS),
  description: z.string().trim().min(5, "Describe the issue in at least 5 characters.").max(2000),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit mobile number.").optional().or(z.literal("")),
  bookingNumber: z.string().trim().max(20).optional(),
});
const ticketPatch = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    assigneeId: z.union([z.string(), z.literal("")]).optional(),
    resolutionNotes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");
const ticketQuery = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  page: z.coerce.number().int().min(1).default(1),
});

function newTicketNumber(): string {
  // crypto-random: Math.random is guessable and would allow ticket enumeration.
  const n = randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, "0");
  return `TKT-${n}`;
}

adminRouter.get("/tickets", requirePermission("tickets:read"), validateQuery(ticketQuery), async (req, res) => {
  const q = (req as typeof req & { validatedQuery: z.infer<typeof ticketQuery> }).validatedQuery;
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.category) filter.category = q.category;
  const items = await TicketModel.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean();
  const total = await TicketModel.countDocuments(filter);
  const bookingIds = items.map((t) => t.bookingId).filter(Boolean);
  const bookings = bookingIds.length
    ? await BookingModel.find({ _id: { $in: bookingIds } }).select("bookingNumber").lean()
    : [];
  const bookingMap = new Map(bookings.map((b) => [String(b._id), b.bookingNumber]));
  res.json({
    ...pageOf(
      items.map((t) => ({ ...t, bookingNumber: t.bookingId ? bookingMap.get(String(t.bookingId)) ?? null : null })),
      total,
      q.page,
      q.limit,
    ),
  });
});

adminRouter.post("/tickets", requirePermission("tickets:write"), validate(ticketCreate), async (req, res) => {
  const body = req.body as z.infer<typeof ticketCreate>;
  let bookingId: Types.ObjectId | undefined;
  if (body.bookingNumber) {
    const b = await BookingModel.findOne({ bookingNumber: body.bookingNumber.toUpperCase() }).select("_id customerId").lean();
    if (!b) throw new AppError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", { bookingNumber: "No booking with this number." });
    bookingId = b._id;
  }
  let ticket;
  for (let attempt = 0; attempt < 3 && !ticket; attempt++) {
    try {
      ticket = await TicketModel.create({
        ticketNumber: newTicketNumber(),
        category: body.category,
        channel: body.channel,
        description: body.description,
        customerName: body.customerName || undefined,
        customerPhone: body.customerPhone || undefined,
        bookingId,
        createdBy: req.principal!.id,
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  if (!ticket) throw new AppError(500, "INTERNAL", "Could not create the ticket. Please retry.");
  await audit({ actorId: req.principal!.id, actorKind: "staff", actorRole: req.principal!.role, action: "ticket.create", entityType: "Ticket", entityId: String(ticket._id), after: { ticketNumber: ticket.ticketNumber, category: ticket.category } });
  res.status(201).json(ticket);
});

adminRouter.patch("/tickets/:id", requirePermission("tickets:write"), validate(ticketPatch), async (req, res) => {
  const id = idParam(req);
  const body = req.body as z.infer<typeof ticketPatch>;
  const before = await TicketModel.findById(id).lean();
  if (!before) throw new AppError(404, "NOT_FOUND", "Ticket not found.");
  const update: Record<string, unknown> = {};
  if (body.status) {
    update.status = body.status;
    if (body.status === "resolved" || body.status === "closed") update.resolvedAt = new Date();
    else update.resolvedAt = null;
  }
  if (body.assigneeId !== undefined) {
    if (body.assigneeId && !Types.ObjectId.isValid(body.assigneeId)) throw new AppError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", { assigneeId: "Invalid staff member." });
    update.assigneeId = body.assigneeId || null;
  }
  if (body.resolutionNotes !== undefined) update.resolutionNotes = body.resolutionNotes;
  const after = await TicketModel.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" }).lean();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "ticket.update",
    entityType: "Ticket",
    entityId: id,
    before: { status: before.status, assigneeId: before.assigneeId, resolutionNotes: before.resolutionNotes },
    after: { status: after?.status, assigneeId: after?.assigneeId, resolutionNotes: after?.resolutionNotes },
  });
  res.json(after);
});

// ---------- Audit ----------
const auditQuery = z.object({
  entityId: z.string().trim().max(50).optional(),
  action: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  page: z.coerce.number().int().min(1).default(1),
});

adminRouter.get("/audit-logs", requirePermission("audit:read"), validateQuery(auditQuery), async (req, res) => {
  const q = (req as unknown as { validatedQuery: z.infer<typeof auditQuery> }).validatedQuery;
  const filter: Record<string, unknown> = {};
  if (q.entityId) filter.entityId = q.entityId;
  if (q.action) filter.action = q.action;
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ at: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);
  res.json({ ...pageOf(items, total, q.page, q.limit) });
});

