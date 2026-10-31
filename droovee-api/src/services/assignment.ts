import mongoose, { Types } from "mongoose";
import { randomBytes, randomInt } from "crypto";
import { BookingModel, DriverModel, AvailabilityBlockModel } from "../models";
import { AppError } from "../lib/errors";
import { audit } from "../lib/audit";
import { hmac } from "../lib/tokens";
import { findConflicts, Conflict, Interval } from "../domain/availability";
import { TERMINAL_STATUSES } from "../domain/status";
import { getActiveSettings } from "./settings";

export interface AssignInput {
  bookingId: string;
  driverId: string;
  actorId: string;
  actorRole: string;
  requestId?: string;
  /** Expected booking version from the client — required, detects stale views. */
  expectedVersion: number;
  /** Required when the driver has conflicts and the admin proceeds anyway. */
  overrideReason?: string;
  /** Required when replacing an existing driver. */
  reassignReason?: string;
}

export interface AssignResult {
  bookingId: string;
  driverId: string;
  status: string;
  warnings: Conflict[];
  /** Plaintext driver link token + share token + trip codes — shown once to staff, hashed in DB. */
  driverToken: string;
  shareToken: string;
  tripCodeStart: string;
  tripCodeEnd: string;
}

/** Issues fresh driver-link, share and trip-code secrets (hashes stored, plaintext returned once). */
export function issueDriverSecrets() {
  const driverToken = randomBytes(24).toString("hex");
  const shareToken = randomBytes(16).toString("hex");
  const tripCodeStart = String(randomInt(1000, 10000));
  let tripCodeEnd = String(randomInt(1000, 10000));
  if (tripCodeEnd === tripCodeStart) tripCodeEnd = String((Number(tripCodeEnd) + 1) % 10000).padStart(4, "0");
  return {
    driverToken,
    shareToken,
    tripCodeStart,
    tripCodeEnd,
    driverTokenHash: hmac(`driver|${driverToken}`),
    shareTokenHash: shareToken,
    tripCodeStartHash: hmac(`trip-start|${tripCodeStart}`),
    tripCodeEndHash: hmac(`trip-end|${tripCodeEnd}`),
  };
}

/**
 * Assigns (or reassigns) a driver in one transaction.
 *
 * Concurrency: the driver document is incremented in the same transaction. Two concurrent
 * assignments for the same driver write-conflict on that document, so one retries and then
 * sees the other's booking as a conflict (409). This needs a replica set (MongoDB Atlas is fine).
 *
 * Conflicts are WARNINGS (confirmed policy). Without an overrideReason the call returns 409
 * with the conflict list. With an overrideReason the override is recorded on the booking.
 */
export async function assignDriver(input: AssignInput): Promise<AssignResult> {
  const { settings } = await getActiveSettings();
  const buffer = settings.policy.driverBufferMinutes.value;
  const session = await mongoose.startSession();
  try {
    let result!: AssignResult;
    await session.withTransaction(async () => {
      const booking = await BookingModel.findById(input.bookingId).session(session);
      if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found.");
      if (input.expectedVersion !== booking.version) {
        throw new AppError(409, "CONFLICT", "Booking was changed by someone else. Reload and try again.");
      }
      if (!["confirmed", "driver_assigned"].includes(booking.status)) {
        throw new AppError(409, "CONFLICT", `A driver can only be assigned to a confirmed booking (current: ${booking.status}).`);
      }

      const previousDriverId = booking.driverId ? String(booking.driverId) : undefined;
      if (previousDriverId === input.driverId) {
        throw new AppError(409, "CONFLICT", "This driver is already assigned to the booking.");
      }
      if (previousDriverId && !input.reassignReason) {
        throw new AppError(400, "VALIDATION_ERROR", "A reason is required to reassign a driver.", { reassignReason: "required" });
      }

      // Lock the driver and verify they are active.
      const driver = await DriverModel.findOneAndUpdate(
        { _id: input.driverId, employmentStatus: "active" },
        { $inc: { assignmentVersion: 1 } },
        { session, returnDocument: "after" },
      );
      if (!driver) throw new AppError(409, "CONFLICT", "Driver is not found or not active.");

      const start = booking.scheduledStart;
      const end = booking.scheduledEnd;
      const bufMs = buffer * 60_000;

      const overlappingBookings = await BookingModel.find({
        driverId: driver._id,
        _id: { $ne: booking._id },
        status: { $nin: TERMINAL_STATUSES },
        scheduledStart: { $lt: new Date(end.getTime() + bufMs) },
        scheduledEnd: { $gt: new Date(start.getTime() - bufMs) },
      })
        .select("bookingNumber scheduledStart scheduledEnd")
        .session(session)
        .lean();

      const blocks = await AvailabilityBlockModel.find({
        driverId: driver._id,
        startAt: { $lt: new Date(end.getTime() + bufMs) },
        endAt: { $gt: new Date(start.getTime() - bufMs) },
      })
        .session(session)
        .lean();

      const existing: Interval[] = [
        ...overlappingBookings.map((b) => ({ start: b.scheduledStart, end: b.scheduledEnd, ref: b.bookingNumber, kind: "booking" as const })),
        ...blocks.map((b) => ({ start: b.startAt, end: b.endAt, ref: String(b._id), kind: "availability_block" as const })),
      ];
      const conflicts = findConflicts({ start, end }, existing, buffer);

      if (conflicts.length > 0 && !input.overrideReason) {
        throw new AppError(409, "CONFLICT", "Driver has overlapping commitments. Confirm the override with a reason to proceed.", undefined, {
          code: "DRIVER_CONFLICT_WARNING",
          conflicts,
        });
      }

      const before = { status: booking.status, driverId: previousDriverId ?? null, version: booking.version };
      const newStatus = booking.status === "confirmed" ? "driver_assigned" : booking.status;

      booking.driverId = driver._id as Types.ObjectId;
      booking.status = newStatus as typeof booking.status;
      if (conflicts.length > 0) {
        booking.conflictOverrides.push({
          driverId: driver._id,
          conflictingRefs: conflicts.map((c) => c.ref ?? c.kind),
          reason: input.overrideReason!,
          actorId: new Types.ObjectId(input.actorId),
          at: new Date(),
        } as never);
      }
      if (newStatus !== before.status) {
        booking.statusHistory.push({
          from: before.status,
          to: newStatus,
          reason: previousDriverId ? `Reassigned: ${input.reassignReason}` : "Driver assigned",
          actorId: new Types.ObjectId(input.actorId),
          actorKind: "staff",
          at: new Date(),
        } as never);
      }
      booking.version += 1;
      const secrets = issueDriverSecrets();
      booking.driverTokenHash = secrets.driverTokenHash as never;
      booking.shareToken = secrets.shareToken as never;
      booking.tripCodeStart = secrets.tripCodeStart as never;
      booking.tripCodeEnd = secrets.tripCodeEnd as never;
      booking.tripCodeStartHash = secrets.tripCodeStartHash as never;
      booking.tripCodeEndHash = secrets.tripCodeEndHash as never;
      await booking.save({ session });

      await audit(
        {
          actorId: input.actorId,
          actorKind: "staff",
          actorRole: input.actorRole,
          action: previousDriverId ? "booking.reassign" : "booking.assign",
          entityType: "Booking",
          entityId: String(booking._id),
          before,
          after: { status: booking.status, driverId: String(driver._id), version: booking.version },
          reason: input.overrideReason ?? input.reassignReason,
          requestId: input.requestId,
        },
        session,
      );

      result = {
        bookingId: String(booking._id),
        driverId: String(driver._id),
        status: booking.status,
        warnings: conflicts,
        driverToken: secrets.driverToken,
        shareToken: secrets.shareToken,
        tripCodeStart: secrets.tripCodeStart,
        tripCodeEnd: secrets.tripCodeEnd,
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
}
