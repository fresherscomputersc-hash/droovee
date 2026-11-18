/**
 * Monthly commute plans: IST calendar maths, lazy attendance rows and the
 * read models shared by the staff console, the customer view and the driver
 * portal.
 *
 * Nothing here schedules work in the background: attendance rows are created
 * on first read of a date range (`ensureAttendance`). That keeps deploys free
 * of cron jobs while staying idempotent, so two staff opening the same month
 * cannot create duplicate rows.
 */
import { Types } from "mongoose";
import {
  BookingModel,
  MonthlyAttendanceModel,
  MonthlyPlanModel,
  MONTHLY_ATTENDANCE_OUTCOMES,
} from "../models";
import { newMonthlyPlanNumber } from "../lib/ids";

export const IST_OFFSET_MS = 330 * 60_000;

/** "YYYY-MM-DD" for the given instant, in IST. */
export function istDateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** IST midnight for a "YYYY-MM-DD" key, as a UTC Date. */
export function dateKeyToIstMidnight(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

export function addDaysToKey(key: string, days: number): string {
  return istDateKey(new Date(dateKeyToIstMidnight(key).getTime() + days * 86_400_000));
}

/** 0 = Sunday … 6 = Saturday, in IST. */
export function weekdayOfKey(key: string): number {
  return new Date(dateKeyToIstMidnight(key).getTime() + IST_OFFSET_MS).getUTCDay();
}

export function todayKey(now: Date = new Date()): string {
  return istDateKey(now);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = dateKeyToIstMidnight(key);
  return !Number.isNaN(d.getTime()) && istDateKey(d) === key;
}

export function clampKey(key: string, lo: string, hi: string): string {
  if (key < lo) return lo;
  if (key > hi) return hi;
  return key;
}

/** First and last day of an IST month ("YYYY-MM"; defaults to the current month). */
export function monthRange(month?: string): { from: string; to: string } {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  const [y, m] = (month ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function planStartKey(plan: Record<string, any>): string {
  return istDateKey(plan.startDate);
}

export function planEndKey(plan: Record<string, any>): string {
  return istDateKey(plan.endDate);
}

export type PlanDayState = "scheduled" | "off_day" | "out_of_range" | "paused" | "ended";

export function pauseCoveringDay(plan: Record<string, any>, key: string) {
  return ((plan.pauses ?? []) as Record<string, any>[]).find(
    (p) => p.from <= key && (p.to == null || key < p.to),
  );
}

/**
 * What a given IST day means for the plan. Paused windows and the end date
 * are evaluated point-in-time, so history stays accurate after a resume.
 */
export function dayState(plan: Record<string, any>, key: string): PlanDayState {
  if (key < planStartKey(plan) || key > planEndKey(plan)) return "out_of_range";
  if (!((plan.workingDays ?? []) as number[]).includes(weekdayOfKey(key))) return "off_day";
  if (pauseCoveringDay(plan, key)) return "paused";
  if (plan.endedAt && key >= istDateKey(plan.endedAt)) return "ended";
  return "scheduled";
}

/** Every scheduled working day in the half-open key range, in order. */
export function scheduledDayKeys(plan: Record<string, any>, fromKey: string, toKey: string): string[] {
  const lo = maxKey(fromKey, planStartKey(plan));
  const hi = minKey(toKey, planEndKey(plan));
  const out: string[] = [];
  for (let key = lo; key <= hi; key = addDaysToKey(key, 1)) {
    if (dayState(plan, key) === "scheduled") out.push(key);
  }
  return out;
}

/** Every calendar day in the range (for the month grid), not just working days. */
export function calendarKeys(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  for (let key = fromKey; key <= toKey; key = addDaysToKey(key, 1)) out.push(key);
  return out;
}

function maxKey(a: string, b: string): string {
  return a > b ? a : b;
}

function minKey(a: string, b: string): string {
  return a < b ? a : b;
}

/**
 * Creates the pending rows a scheduled day needs, then returns the rows in the
 * range (including any marks already recorded). Safe to call on every read.
 */
export async function ensureAttendance(
  plan: Record<string, any>,
  fromKey: string,
  toKey: string,
): Promise<Record<string, any>[]> {
  const keys = scheduledDayKeys(plan, fromKey, toKey);
  if (keys.length > 0) {
    await MonthlyAttendanceModel.bulkWrite(
      keys.map((dateKey) => ({
        updateOne: {
          filter: { planId: plan._id, dateKey },
          update: {
            $setOnInsert: {
              planId: plan._id,
              customerId: plan.customerId,
              driverId: plan.driverId ?? null,
              dateKey,
              date: dateKeyToIstMidnight(dateKey),
              pickup: { status: "pending" },
              drop: { status: "pending" },
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  return (await MonthlyAttendanceModel.find({
    planId: plan._id,
    dateKey: { $gte: fromKey, $lte: toKey },
  })
    .sort({ dateKey: 1 })
    .lean()) as unknown as Record<string, any>[];
}

export function attendanceSlotView(slot: Record<string, any> | undefined) {
  return {
    status: slot?.status ?? "pending",
    note: slot?.note ?? null,
    markedAt: slot?.markedAt ?? null,
    markedByKind: slot?.markedByKind ?? null,
    markedByName: slot?.markedByName ?? null,
  };
}

export function attendanceDayView(plan: Record<string, any>, key: string, row?: Record<string, any>) {
  return {
    dateKey: key,
    weekday: weekdayOfKey(key),
    state: dayState(plan, key),
    pickup: attendanceSlotView(row?.pickup),
    drop: attendanceSlotView(row?.drop),
  };
}

/**
 * A day counts as attended when the pickup leg ran, which is the commute the
 * customer pays for; the drop is reported separately. Holidays are removed
 * from the expected-days denominator so a declared holiday never looks like a
 * missed day.
 */
export function summariseAttendance(
  plan: Record<string, any>,
  rows: Record<string, any>[],
  fromKey: string,
  toKey: string,
) {
  const keys = scheduledDayKeys(plan, fromKey, toKey);
  const byKey = new Map(rows.map((r) => [String(r.dateKey), r]));
  let pickupPresent = 0;
  let dropPresent = 0;
  let fullDays = 0;
  let absences = 0;
  let holidays = 0;
  let unmarkedDays = 0;
  for (const key of keys) {
    const r = byKey.get(key);
    const p = (r?.pickup?.status as string | undefined) ?? "pending";
    const d = (r?.drop?.status as string | undefined) ?? "pending";
    if (p === "holiday" || d === "holiday") {
      holidays += 1;
      continue;
    }
    if (p === "present") pickupPresent += 1;
    if (d === "present") dropPresent += 1;
    if (p === "present" && d === "present") fullDays += 1;
    if (["customer_absent", "driver_absent"].includes(p) || ["customer_absent", "driver_absent"].includes(d)) {
      absences += 1;
    }
    if (p === "pending" && d === "pending") unmarkedDays += 1;
  }
  const expectedDays = keys.length - holidays;
  return {
    from: fromKey,
    to: toKey,
    expectedDays,
    scheduledDays: keys.length,
    daysAttended: pickupPresent,
    pickupPresent,
    dropPresent,
    fullDays,
    absences,
    holidays,
    unmarkedDays,
    attendanceRate: expectedDays > 0 ? Math.round((pickupPresent / expectedDays) * 100) : 0,
  };
}

/** First scheduled day at or after `fromKey` that has not been marked yet. */
export function nextPickupKey(plan: Record<string, any>, rows: Record<string, any>[], fromKey: string): string | null {
  const byKey = new Map(rows.map((r) => [String(r.dateKey), r]));
  const end = planEndKey(plan);
  let key = maxKey(fromKey, planStartKey(plan));
  for (let i = 0; key <= end && i < 400; i += 1, key = addDaysToKey(key, 1)) {
    if (dayState(plan, key) !== "scheduled") continue;
    const row = byKey.get(key);
    if ((row?.pickup?.status ?? "pending") === "pending") return key;
  }
  return null;
}

export function planView(plan: Record<string, any>, extra: { driver?: Record<string, any> | null; summary?: unknown } = {}) {
  const driver = extra.driver;
  return {
    id: String(plan._id),
    planNumber: plan.planNumber,
    bookingId: plan.bookingId ? String(plan.bookingId) : null,
    status: plan.status,
    customer: {
      id: String(plan.customerId),
      name: plan.customerSnapshot?.name ?? "",
      phone: plan.customerSnapshot?.phone ?? "",
    },
    driver: driver
      ? {
          id: String(driver._id),
          name: driver.name,
          phone: driver.phone,
          employeeCode: driver.employeeCode,
        }
      : null,
    startDate: planStartKey(plan),
    endDate: planEndKey(plan),
    workingDays: plan.workingDays ?? [],
    pickupTime: plan.pickupTime,
    dropTime: plan.dropTime,
    pickupAddress: plan.pickupAddress,
    dropAddress: plan.dropAddress ?? null,
    notes: plan.notes ?? null,
    paused: Boolean(pauseCoveringDay(plan, todayKey())),
    pausedAt: plan.pausedAt ?? null,
    endedAt: plan.endedAt ?? null,
    endReason: plan.endReason ?? null,
    version: plan.version ?? 0,
    createdAt: plan.createdAt,
    summary: extra.summary ?? null,
  };
}

/**
 * Carries existing `monthly_office` bookings with a recurrence over to plans.
 * Idempotent (unique bookingId), so it can run on the first read after a
 * deploy and never duplicate a plan. Returns how many plans were created.
 */
let carriedOver = false;
let carryOverPromise: Promise<number> | null = null;

export function carryOverMonthlyBookings(): Promise<number> {
  // Legacy rows only: new monthly bookings get a plan as soon as they are
  // created (ensurePlanForBooking), so one scan per process is enough.
  if (carriedOver) return Promise.resolve(0);
  if (!carryOverPromise) {
    carryOverPromise = runCarryOver()
      .then((n) => {
        carriedOver = true;
        return n;
      })
      .finally(() => {
        carryOverPromise = null;
      });
  }
  return carryOverPromise;
}

/** Creates the plan for a monthly_office booking, if it does not exist yet. */
export async function ensurePlanForBooking(b: Record<string, any>): Promise<boolean> {
  const r = b?.recurrence as Record<string, any> | undefined;
  if (b?.serviceType !== "monthly_office") return false;
  if (!r?.startDate || !r?.endDate || !r?.startTime || !r?.endTime) return false;
  if (!Array.isArray(r.days) || r.days.length === 0) return false;
  if (await MonthlyPlanModel.exists({ bookingId: b._id })) return false;
  try {
    await MonthlyPlanModel.create({
      planNumber: newMonthlyPlanNumber(),
      bookingId: b._id,
      customerId: b.customerId,
      customerSnapshot: {
        name: b.customerSnapshot?.name ?? "Customer",
        phone: b.customerSnapshot?.phone ?? "",
      },
      driverId: b.driverId,
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      workingDays: r.days,
      pickupTime: r.startTime,
      dropTime: r.endTime,
      pickupAddress: b.pickup?.address ?? "-",
      dropAddress: b.destination?.address ?? r.returnPickup ?? undefined,
      notes: b.bookingNumber ? `Carried over from booking ${b.bookingNumber}` : undefined,
      status: "active",
    });
    return true;
  } catch (e) {
    // A concurrent creation already inserted the plan for this booking.
    if ((e as { code?: number }).code === 11000) return false;
    throw e;
  }
}

async function runCarryOver(): Promise<number> {
  const bookings = (await BookingModel.find({
    serviceType: "monthly_office",
    recurrence: { $exists: true, $ne: null },
  })
    .select("bookingNumber customerId customerSnapshot driverId pickup destination recurrence")
    .lean()) as unknown as Record<string, any>[];

  let created = 0;
  for (const b of bookings) {
    if (await ensurePlanForBooking(b)) created += 1;
  }
  return created;
}

export function isAttendanceOutcome(value: string): value is (typeof MONTHLY_ATTENDANCE_OUTCOMES)[number] {
  return (MONTHLY_ATTENDANCE_OUTCOMES as readonly string[]).includes(value);
}

export function objectId(value: string, label = "id"): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return new Types.ObjectId(value);
}
