/**
 * Staff console API for monthly commute plans.
 *
 * Mounted at /api/v1/admin/monthly-plans (staff auth + monthly permissions).
 * The customer and driver read models live with their own portals, but share
 * the calendar maths in services/monthly.ts so every side agrees on what a
 * scheduled day, an absence and an expected day are.
 */
import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import {
  CustomerModel,
  DriverModel,
  MonthlyAttendanceModel,
  MonthlyPlanModel,
  StaffModel,
  MONTHLY_ATTENDANCE_OUTCOMES,
  MONTHLY_PLAN_STATUSES,
} from "../models";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate, validateQuery } from "../lib/validate";
import { AppError } from "../lib/errors";
import { audit } from "../lib/audit";
import { newMonthlyPlanNumber } from "../lib/ids";
import {
  addDaysToKey,
  attendanceDayView,
  calendarKeys,
  carryOverMonthlyBookings,
  clampKey,
  dateKeyToIstMidnight,
  dayState,
  ensureAttendance,
  isValidDateKey,
  monthRange,
  planEndKey,
  planStartKey,
  planView,
  scheduledDayKeys,
  summariseAttendance,
  todayKey,
} from "../services/monthly";

export const monthlyRouter = Router();
// Mounted separately from adminRouter, so it repeats the staff-only gate.
monthlyRouter.use(authenticate);
monthlyRouter.use((req, _res, next) => {
  if (req.principal?.kind !== "staff") return next(new AppError(403, "FORBIDDEN", "Staff account required."));
  next();
});

const dateKeySchema = z.string().refine(isValidDateKey, "Use a date in YYYY-MM-DD format.");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 09:30.");
const workingDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1, "Pick at least one working day.")
  .max(7)
  .refine((days) => new Set(days).size === days.length, "Working days must be unique.");

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loadPlan(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new AppError(404, "NOT_FOUND", "Monthly plan not found.");
  const plan = await MonthlyPlanModel.findById(id).lean();
  if (!plan) throw new AppError(404, "NOT_FOUND", "Monthly plan not found.");
  return plan as unknown as Record<string, any>;
}

async function driverFor(plan: Record<string, any>) {
  if (!plan.driverId) return null;
  const d = await DriverModel.findById(plan.driverId).select("name phone employeeCode").lean();
  return (d ?? null) as Record<string, any> | null;
}

async function staffName(id: string): Promise<string | undefined> {
  const s = await StaffModel.findById(id).select("name").lean();
  return (s as { name?: string } | null)?.name;
}

/** Reads a range from the query, clamped to the plan window and a sane size. */
function rangeFor(plan: Record<string, any>, from?: string, to?: string) {
  const month = monthRange();
  const planStart = planStartKey(plan);
  const planEnd = planEndKey(plan);
  let lo = from ?? clampKey(month.from, planStart, planEnd);
  let hi = to ?? clampKey(month.to, planStart, planEnd);
  if (lo < planStart) lo = planStart;
  if (hi > planEnd) hi = planEnd;
  if (hi < lo) {
    lo = planStart;
    hi = planEnd;
  }
  // 92 days is enough for a month grid plus a little context.
  const maxHi = addDaysToKey(lo, 91);
  if (hi > maxHi) hi = maxHi;
  return { from: lo, to: hi };
}

// ---------- List ----------

const listQuery = z.object({
  status: z.enum([...MONTHLY_PLAN_STATUSES, "all"]).default("active"),
  q: z.string().trim().max(80).optional(),
  driverId: z.string().optional(),
  /** "YYYY-MM" for the summary window; defaults to the current IST month. */
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

monthlyRouter.get("/", requirePermission("monthly:read"), validateQuery(listQuery), async (req, res) => {
  const q = (req as unknown as { validatedQuery: z.infer<typeof listQuery> }).validatedQuery;
  await carryOverMonthlyBookings();

  const filter: Record<string, unknown> = {};
  if (q.status !== "all") filter.status = q.status;
  if (q.driverId) filter.driverId = new Types.ObjectId(q.driverId);
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    filter.$or = [{ planNumber: rx }, { "customerSnapshot.name": rx }, { "customerSnapshot.phone": rx }];
  }

  const [plans, total] = await Promise.all([
    MonthlyPlanModel.find(filter)
      .sort({ status: 1, startDate: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    MonthlyPlanModel.countDocuments(filter),
  ]);
  const list = plans as unknown as Record<string, any>[];

  const { from, to } = monthRange(q.month);
  const planIds = list.map((p) => p._id);
  const [rows, drivers] = await Promise.all([
    planIds.length
      ? MonthlyAttendanceModel.find({ planId: { $in: planIds }, dateKey: { $gte: from, $lte: to } }).lean()
      : Promise.resolve([]),
    planIds.length
      ? DriverModel.find({ _id: { $in: list.map((p) => p.driverId).filter(Boolean) } })
          .select("name phone employeeCode")
          .lean()
      : Promise.resolve([]),
  ]);
  const driverById = new Map((drivers as unknown as Record<string, any>[]).map((d) => [String(d._id), d]));

  const items = list.map((plan) => {
    const planRows = (rows as unknown as Record<string, any>[]).filter((r) => String(r.planId) === String(plan._id));
    return planView(plan, {
      driver: plan.driverId ? driverById.get(String(plan.driverId)) ?? null : null,
      summary: summariseAttendance(plan, planRows, from, to),
    });
  });

  res.json({ items, page: q.page, limit: q.limit, total, month: { from, to } });
});

// ---------- Detail (plan + day grid + summary) ----------

const detailQuery = z.object({
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
});

monthlyRouter.get("/:id", requirePermission("monthly:read"), validateQuery(detailQuery), async (req, res) => {
  const q = (req as unknown as { validatedQuery: z.infer<typeof detailQuery> }).validatedQuery;
  const plan = await loadPlan(String(req.params.id));
  const { from, to } = rangeFor(plan, q.from, q.to);
  const [rows, driver] = await Promise.all([ensureAttendance(plan, from, to), driverFor(plan)]);
  const rowByKey = new Map(rows.map((r) => [String(r.dateKey), r]));

  res.json({
    plan: planView(plan, { driver, summary: summariseAttendance(plan, rows, from, to) }),
    from,
    to,
    days: calendarKeys(from, to).map((key) => attendanceDayView(plan, key, rowByKey.get(key))),
  });
});

// ---------- Create / update ----------

const createSchema = z
  .object({
    customerId: z.string().min(1),
    driverId: z.string().min(1).optional().nullable(),
    startDate: dateKeySchema,
    endDate: dateKeySchema,
    workingDays: workingDaysSchema,
    pickupTime: timeSchema,
    dropTime: timeSchema,
    pickupAddress: z.string().trim().min(3).max(300),
    dropAddress: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.endDate >= b.startDate, { message: "End date must be on or after the start date.", path: ["endDate"] });

monthlyRouter.post("/", requirePermission("monthly:write"), validate(createSchema), async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  if (!Types.ObjectId.isValid(body.customerId)) throw new AppError(400, "VALIDATION_ERROR", "Choose a valid customer.");
  const customer = await CustomerModel.findById(body.customerId).select("name phone active").lean();
  if (!customer) throw new AppError(404, "NOT_FOUND", "Customer not found.");
  if (!customer.active) throw new AppError(409, "CONFLICT", "This customer account is disabled.");

  if (body.driverId) {
    if (!Types.ObjectId.isValid(body.driverId)) throw new AppError(400, "VALIDATION_ERROR", "Choose a valid driver.");
    const driver = await DriverModel.findById(body.driverId).select("employmentStatus").lean();
    if (!driver) throw new AppError(404, "NOT_FOUND", "Driver not found.");
    if (driver.employmentStatus !== "active") throw new AppError(409, "CONFLICT", "This driver is not active.");
  }

  const plan = await MonthlyPlanModel.create({
    planNumber: newMonthlyPlanNumber(),
    customerId: customer._id,
    customerSnapshot: { name: customer.name, phone: customer.phone },
    driverId: body.driverId ? new Types.ObjectId(body.driverId) : undefined,
    startDate: dateKeyToIstMidnight(body.startDate),
    endDate: dateKeyToIstMidnight(body.endDate),
    workingDays: body.workingDays,
    pickupTime: body.pickupTime,
    dropTime: body.dropTime,
    pickupAddress: body.pickupAddress,
    dropAddress: body.dropAddress,
    notes: body.notes,
    status: "active",
    createdBy: new Types.ObjectId(req.principal!.id),
    version: 0,
  });

  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "monthly_plan.create",
    entityType: "MonthlyPlan",
    entityId: String(plan._id),
    after: { planNumber: plan.planNumber, startDate: plan.startDate, endDate: plan.endDate },
    requestId: req.requestId,
  });

  res.status(201).json(
    planView(plan.toObject() as unknown as Record<string, any>, {
      driver: await driverFor(plan.toObject() as unknown as Record<string, any>),
    }),
  );
});

const updateSchema = z.object({
  driverId: z.string().min(1).nullable().optional(),
  startDate: dateKeySchema.optional(),
  endDate: dateKeySchema.optional(),
  workingDays: workingDaysSchema.optional(),
  pickupTime: timeSchema.optional(),
  dropTime: timeSchema.optional(),
  pickupAddress: z.string().trim().min(3).max(300).optional(),
  dropAddress: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  expectedVersion: z.number().int(),
});

monthlyRouter.patch("/:id", requirePermission("monthly:write"), validate(updateSchema), async (req, res) => {
  const body = req.body as z.infer<typeof updateSchema>;
  const plan = await MonthlyPlanModel.findById(String(req.params.id));
  if (!plan) throw new AppError(404, "NOT_FOUND", "Monthly plan not found.");
  if (plan.status === "ended") throw new AppError(409, "CONFLICT", "This plan has ended. Reopen it before editing.");
  if (body.expectedVersion !== plan.version) {
    throw new AppError(409, "CONFLICT", "This plan was changed by someone else. Reload and try again.");
  }

  if (body.driverId !== undefined) {
    if (body.driverId === null) {
      plan.driverId = undefined;
    } else {
      if (!Types.ObjectId.isValid(body.driverId)) throw new AppError(400, "VALIDATION_ERROR", "Choose a valid driver.");
      const driver = await DriverModel.findById(body.driverId).select("employmentStatus").lean();
      if (!driver) throw new AppError(404, "NOT_FOUND", "Driver not found.");
      if (driver.employmentStatus !== "active") throw new AppError(409, "CONFLICT", "This driver is not active.");
      plan.driverId = new Types.ObjectId(body.driverId) as never;
    }
  }
  if (body.startDate) plan.startDate = dateKeyToIstMidnight(body.startDate) as never;
  if (body.endDate) plan.endDate = dateKeyToIstMidnight(body.endDate) as never;
  if (planEndKey(plan as never) < planStartKey(plan as never)) {
    throw new AppError(400, "VALIDATION_ERROR", "End date must be on or after the start date.", { endDate: "Check the dates." });
  }
  if (body.workingDays) plan.workingDays = body.workingDays as never;
  if (body.pickupTime) plan.pickupTime = body.pickupTime;
  if (body.dropTime) plan.dropTime = body.dropTime;
  if (body.pickupAddress) plan.pickupAddress = body.pickupAddress;
  if (body.dropAddress !== undefined) plan.dropAddress = body.dropAddress;
  if (body.notes !== undefined) plan.notes = body.notes;

  plan.version += 1;
  await plan.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "monthly_plan.update",
    entityType: "MonthlyPlan",
    entityId: String(plan._id),
    after: {
      driverId: plan.driverId ? String(plan.driverId) : null,
      pickupTime: plan.pickupTime,
      dropTime: plan.dropTime,
      workingDays: plan.workingDays,
    },
    requestId: req.requestId,
  });
  const obj = plan.toObject() as unknown as Record<string, any>;
  res.json(planView(obj, { driver: await driverFor(obj) }));
});

// ---------- Pause / resume / end ----------

const pauseSchema = z.object({
  reason: z.string().trim().max(300).optional(),
  expectedVersion: z.number().int(),
});

monthlyRouter.post("/:id/pause", requirePermission("monthly:write"), validate(pauseSchema), async (req, res) => {
  const body = req.body as z.infer<typeof pauseSchema>;
  const plan = await MonthlyPlanModel.findById(String(req.params.id));
  if (!plan) throw new AppError(404, "NOT_FOUND", "Monthly plan not found.");
  if (plan.status === "ended") throw new AppError(409, "CONFLICT", "This plan has ended.");
  if (plan.status === "paused") throw new AppError(409, "CONFLICT", "This plan is already paused.");
  if (body.expectedVersion !== plan.version) {
    throw new AppError(409, "CONFLICT", "This plan was changed by someone else. Reload and try again.");
  }

  const now = new Date();
  plan.pauses.push({ from: todayKey(now), to: null, reason: body.reason, pausedAt: now, pausedBy: new Types.ObjectId(req.principal!.id) } as never);
  plan.status = "paused";
  plan.pausedAt = now;
  plan.version += 1;
  await plan.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "monthly_plan.pause",
    entityType: "MonthlyPlan",
    entityId: String(plan._id),
    after: { pausedFrom: todayKey(now) },
    reason: body.reason,
    requestId: req.requestId,
  });
  res.json({ id: String(plan._id), status: plan.status, pausedFrom: todayKey(now), version: plan.version });
});

const resumeSchema = z.object({ expectedVersion: z.number().int() });

monthlyRouter.post("/:id/resume", requirePermission("monthly:write"), validate(resumeSchema), async (req, res) => {
  const body = req.body as z.infer<typeof resumeSchema>;
  const plan = await MonthlyPlanModel.findById(String(req.params.id));
  if (!plan) throw new AppError(404, "NOT_FOUND", "Monthly plan not found.");
  if (plan.status !== "paused") throw new AppError(409, "CONFLICT", "This plan is not paused.");
  if (body.expectedVersion !== plan.version) {
    throw new AppError(409, "CONFLICT", "This plan was changed by someone else. Reload and try again.");
  }

  const now = new Date();
  const open = (plan.pauses as unknown as Record<string, any>[]).find((p) => p.to == null);
  if (!open) throw new AppError(409, "CONFLICT", "No open pause window was found.");
  // Half-open [from, to): the plan is live again from today.
  open.to = todayKey(now);
  open.resumedAt = now;
  open.resumedBy = new Types.ObjectId(req.principal!.id);
  plan.status = "active";
  plan.pausedAt = undefined;
  plan.version += 1;
  await plan.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "monthly_plan.resume",
    entityType: "MonthlyPlan",
    entityId: String(plan._id),
    after: { resumedFrom: todayKey(now) },
    requestId: req.requestId,
  });
  res.json({ id: String(plan._id), status: plan.status, resumedFrom: todayKey(now), version: plan.version });
});

const endSchema = z.object({
  reason: z.string().trim().min(3).max(300),
  expectedVersion: z.number().int(),
});

monthlyRouter.post("/:id/end", requirePermission("monthly:write"), validate(endSchema), async (req, res) => {
  const body = req.body as z.infer<typeof endSchema>;
  const plan = await MonthlyPlanModel.findById(String(req.params.id));
  if (!plan) throw new AppError(404, "NOT_FOUND", "Monthly plan not found.");
  if (plan.status === "ended") throw new AppError(409, "CONFLICT", "This plan has already ended.");
  if (body.expectedVersion !== plan.version) {
    throw new AppError(409, "CONFLICT", "This plan was changed by someone else. Reload and try again.");
  }

  const now = new Date();
  const open = (plan.pauses as unknown as Record<string, any>[]).find((p) => p.to == null);
  if (open) {
    open.to = todayKey(now);
    open.resumedAt = now;
    open.resumedBy = new Types.ObjectId(req.principal!.id);
  }
  plan.status = "ended";
  plan.endedAt = now;
  plan.endReason = body.reason;
  plan.endedBy = new Types.ObjectId(req.principal!.id) as never;
  plan.pausedAt = undefined;
  plan.version += 1;
  await plan.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "monthly_plan.end",
    entityType: "MonthlyPlan",
    entityId: String(plan._id),
    after: { endedAt: now },
    reason: body.reason,
    requestId: req.requestId,
  });
  res.json({ id: String(plan._id), status: plan.status, endedAt: now, version: plan.version });
});

// ---------- Attendance ----------

const outcomeSchema = z.enum(MONTHLY_ATTENDANCE_OUTCOMES);

const markSchema = z
  .object({
    dateKey: dateKeySchema,
    pickup: outcomeSchema.optional(),
    drop: outcomeSchema.optional(),
    note: z.string().trim().max(300).optional(),
  })
  .refine((b) => b.pickup !== undefined || b.drop !== undefined, {
    message: "Mark the pickup, the drop, or both.",
    path: ["pickup"],
  });

monthlyRouter.post("/:id/attendance", requirePermission("monthly:write"), validate(markSchema), async (req, res) => {
  const body = req.body as z.infer<typeof markSchema>;
  const plan = await loadPlan(String(req.params.id));
  if (plan.status === "ended" && body.dateKey >= (plan.endedAt ? todayKey(plan.endedAt) : "9999-12-31")) {
    throw new AppError(409, "CONFLICT", "This plan has ended. Reopen it before marking attendance.");
  }
  if (body.dateKey < planStartKey(plan) || body.dateKey > planEndKey(plan)) {
    throw new AppError(400, "VALIDATION_ERROR", "That date is outside the plan.", { dateKey: "Pick a date inside the plan." });
  }
  const state = dayState(plan, body.dateKey);
  if (state !== "scheduled") {
    throw new AppError(409, "CONFLICT", `That day is not a working day for this plan (${state.replace("_", " ")}).`);
  }

  await MonthlyAttendanceModel.updateOne(
    { planId: plan._id, dateKey: body.dateKey },
    {
      $setOnInsert: {
        planId: plan._id,
        customerId: plan.customerId,
        driverId: plan.driverId ?? null,
        dateKey: body.dateKey,
        date: dateKeyToIstMidnight(body.dateKey),
      },
    },
    { upsert: true },
  );
  const before = await MonthlyAttendanceModel.findOne({ planId: plan._id, dateKey: body.dateKey }).lean();
  const now = new Date();
  const name = await staffName(req.principal!.id);
  const set: Record<string, unknown> = {};
  for (const slot of ["pickup", "drop"] as const) {
    const outcome = body[slot];
    if (outcome === undefined) continue;
    set[`${slot}.status`] = outcome;
    set[`${slot}.markedAt`] = now;
    set[`${slot}.markedByKind`] = "staff";
    set[`${slot}.markedById`] = new Types.ObjectId(req.principal!.id);
    set[`${slot}.markedByName`] = name;
    if (body.note !== undefined) set[`${slot}.note`] = body.note;
  }
  const updated = await MonthlyAttendanceModel.findOneAndUpdate(
    { planId: plan._id, dateKey: body.dateKey },
    { $set: set },
    { returnDocument: "after" },
  ).lean();

  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "monthly_attendance.mark",
    entityType: "MonthlyAttendance",
    entityId: `${plan._id}:${body.dateKey}`,
    before: {
      pickup: (before as Record<string, any> | null)?.pickup?.status ?? "pending",
      drop: (before as Record<string, any> | null)?.drop?.status ?? "pending",
    },
    after: { dateKey: body.dateKey, pickup: body.pickup, drop: body.drop, note: body.note },
    requestId: req.requestId,
  });

  res.json({
    planId: String(plan._id),
    day: attendanceDayView(plan, body.dateKey, updated ? (updated as unknown as Record<string, any>) : undefined),
  });
});

const bulkSchema = z
  .object({
    from: dateKeySchema,
    to: dateKeySchema,
    slots: z.array(z.enum(["pickup", "drop"])).min(1).max(2).default(["pickup", "drop"]),
    outcome: z.enum(["present", "customer_absent", "driver_absent", "holiday"]).default("present"),
    /** false (default): only fill days that are still unmarked. */
    overwrite: z.boolean().default(false),
  })
  .refine((b) => b.to >= b.from, { message: "End date must be on or after the start date.", path: ["to"] });

monthlyRouter.post("/:id/attendance/bulk", requirePermission("monthly:write"), validate(bulkSchema), async (req, res) => {
  const body = req.body as z.infer<typeof bulkSchema>;
  const plan = await loadPlan(String(req.params.id));
  if (plan.status === "ended") throw new AppError(409, "CONFLICT", "This plan has ended. Reopen it before marking attendance.");
  if (body.to > addDaysToKey(body.from, 91)) {
    throw new AppError(400, "VALIDATION_ERROR", "Mark at most 92 days at a time.", { to: "Choose a shorter range." });
  }
  const keys = scheduledDayKeys(plan, body.from, body.to);
  if (keys.length === 0) {
    return res.json({ marked: 0, skipped: 0, days: [], message: "No working days in that range." });
  }

  await ensureAttendance(plan, body.from, body.to);
  const rows = (await MonthlyAttendanceModel.find({
    planId: plan._id,
    dateKey: { $gte: body.from, $lte: body.to },
  }).lean()) as unknown as Record<string, any>[];
  const scheduled = new Set(keys);
  const now = new Date();
  const name = await staffName(req.principal!.id);
  const ops: Parameters<typeof MonthlyAttendanceModel.bulkWrite>[0] = [];
  const markedKeys: string[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (!scheduled.has(String(row.dateKey))) continue;
    const holiday = row.pickup?.status === "holiday" || row.drop?.status === "holiday";
    if (holiday && !body.overwrite) {
      skipped += 1;
      continue;
    }
    const set: Record<string, unknown> = {};
    let touched = false;
    for (const slot of body.slots) {
      const current = row[slot]?.status ?? "pending";
      if (!body.overwrite && current !== "pending") continue;
      set[`${slot}.status`] = body.outcome;
      set[`${slot}.markedAt`] = now;
      set[`${slot}.markedByKind`] = "staff";
      set[`${slot}.markedById`] = new Types.ObjectId(req.principal!.id);
      set[`${slot}.markedByName`] = name;
      touched = true;
    }
    if (!touched) {
      skipped += 1;
      continue;
    }
    ops.push({ updateOne: { filter: { _id: row._id }, update: { $set: set } } });
    markedKeys.push(String(row.dateKey));
  }

  if (ops.length > 0) await MonthlyAttendanceModel.bulkWrite(ops, { ordered: false });

  await audit({
    actorId: req.principal!.id,
    actorKind: "staff",
    actorRole: req.principal!.role,
    action: "monthly_attendance.bulk_mark",
    entityType: "MonthlyPlan",
    entityId: String(plan._id),
    after: { from: body.from, to: body.to, outcome: body.outcome, slots: body.slots, days: markedKeys.length },
    requestId: req.requestId,
  });

  res.json({ marked: markedKeys.length, skipped, days: markedKeys });
});
