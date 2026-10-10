import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { BookingModel, CustomerModel, DriverModel } from "../models";
import { authenticate, requireCustomer } from "../middleware/auth";
import { validate } from "../lib/validate";
import { AppError } from "../lib/errors";
import { newBookingNumber } from "../lib/ids";
import { audit } from "../lib/audit";
import { estimateFare } from "../domain/pricing";
import { bookingEnd } from "../domain/availability";
import { getActiveSettings } from "../services/settings";
import { validateCoupon, consumeCoupon, assertCouponMinAmount, alreadyRedeemed, recordRedemption, releaseCouponUse, type ValidCoupon } from "../services/coupons";
import { SERVICE_TYPES } from "./pricing";
import { bookingCreateLimiter } from "../lib/rateLimit";
import { BookingStatus } from "../domain/status";
import { config } from "../config";

export const bookingsRouter = Router();

/** Monthly office pickup/drop schedule: recurring days, times, dates. */
const recurrenceSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  returnPickup: z.string().trim().max(300).optional(),
});

const bookingSchema = z
  .object({
    serviceType: z.enum(SERVICE_TYPES),
    immediate: z.boolean().default(false),
    pickup: z.object({
      address: z.string().trim().min(5).max(300),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    }),
    destination: z
      .object({
        address: z.string().trim().min(5).max(300),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
      })
      .optional(),
    scheduledStart: z.coerce.date(),
    durationHours: z.number().min(0.5).max(24 * 31),
    scheduledEnd: z.coerce.date().optional(),
    nights: z.number().int().min(0).max(60).default(0),
    carModel: z.string().trim().min(2).max(80),
    transmission: z.enum(["manual", "automatic"]),
    instructions: z.string().trim().max(1000).default(""),
    couponCode: z.string().trim().max(40).optional(),
    recurrence: recurrenceSchema.optional(),
  })
  .superRefine((b, ctx) => {
    const needsDestination = ["outstation_one_way", "outstation_round_trip", "airport_pickup_drop"].includes(b.serviceType);
    if (needsDestination && !b.destination) {
      ctx.addIssue({ code: "custom", path: ["destination"], message: "Destination is required for this service." });
    }
    if (b.serviceType === "monthly_office" && !b.destination) {
      ctx.addIssue({ code: "custom", path: ["destination"], message: "Office address is required for monthly pickup/drop." });
    }
    if (b.serviceType === "outstation_round_trip" && b.nights === 0) {
      // Round trips may not need a night halt; allowed, admin reviews.
    }
    if (b.serviceType === "outstation_one_way" || b.serviceType === "outstation_round_trip") {
      if (!b.scheduledEnd) {
        ctx.addIssue({ code: "custom", path: ["scheduledEnd"], message: "Return/end time is required for outstation trips." });
      }
    }
    if (b.serviceType === "monthly_office") {
      if (!b.recurrence) {
        ctx.addIssue({ code: "custom", path: ["recurrence"], message: "Working schedule is required for monthly bookings." });
      } else {
        if (b.recurrence.endDate <= b.recurrence.startDate) {
          ctx.addIssue({ code: "custom", path: ["recurrence"], message: "Schedule end date must be after the start date." });
        }
        if (b.scheduledStart < b.recurrence.startDate || b.scheduledStart > b.recurrence.endDate) {
          ctx.addIssue({ code: "custom", path: ["scheduledStart"], message: "Start must fall inside the schedule dates." });
        }
      }
    }
  });

/** Customer creates a booking. Requires a verified mobile number (confirmed requirement). */
bookingsRouter.post("/", authenticate, requireCustomer, bookingCreateLimiter(), validate(bookingSchema), async (req, res) => {
  const b = req.body as z.infer<typeof bookingSchema>;
  const customerId = new Types.ObjectId(req.principal!.id);
  const customer = await CustomerModel.findById(customerId).lean();
  if (!customer || (config.otpEnabled && !customer.phoneVerified)) {
    throw new AppError(403, "FORBIDDEN", "Verify your mobile number before booking.");
  }

  const { version, settings } = await getActiveSettings();
  const now = new Date();

  // Lead time: unconfirmed; the setting is 0 until the client sets it.
  const leadMinutes = settings.policy.minLeadTimeMinutes.value;
  if (!b.immediate && b.scheduledStart.getTime() < now.getTime() + leadMinutes * 60_000) {
    throw new AppError(400, "VALIDATION_ERROR", `Bookings need at least ${leadMinutes} minutes' notice.`, { scheduledStart: "too_soon" });
  }
  if (b.scheduledStart.getTime() < now.getTime() - 60_000) {
    throw new AppError(400, "VALIDATION_ERROR", "Start time is in the past.", { scheduledStart: "past" });
  }

  const end = bookingEnd(b.scheduledStart, b.durationHours, b.scheduledEnd);
  if (end <= b.scheduledStart) {
    throw new AppError(400, "VALIDATION_ERROR", "End time must be after start time.", { scheduledEnd: "invalid" });
  }
  if (b.scheduledEnd) {
    // The explicit end and durationHours must describe the same trip, otherwise
    // the fare (duration) and the driver block (end) silently disagree.
    const impliedHours = (b.scheduledEnd.getTime() - b.scheduledStart.getTime()) / 3_600_000;
    if (Math.abs(impliedHours - b.durationHours) > 1 / 60) {
      throw new AppError(400, "VALIDATION_ERROR", "End time does not match the duration.", { scheduledEnd: "does_not_match_duration" });
    }
  }

  // Coupon: validate now, check the minimum spend against the undiscounted
  // fare, then consume + record the redemption after the booking is saved.
  let coupon: ValidCoupon | undefined;
  if (b.couponCode) {
    coupon = await validateCoupon(b.couponCode, b.serviceType, now);
    if (coupon.perCustomerLimit === 1 && (await alreadyRedeemed(coupon.code, customerId))) {
      throw new AppError(400, "VALIDATION_ERROR", "You have already used this coupon.", { couponCode: "already_used" });
    }
  }

  const fareInput = {
    serviceType: b.serviceType,
    durationHours: b.durationHours,
    startAt: b.scheduledStart,
    nights: b.nights,
  };
  const base = estimateFare(fareInput, settings);
  if (coupon) assertCouponMinAmount(coupon, base.total);
  const estimate =
    coupon?.type === "first_hour_price" ? estimateFare({ ...fareInput, firstHourCouponPrice: coupon.value }, settings) : base;

  // Retry on the (very unlikely) booking-number collision.
  let booking;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    try {
      booking = await BookingModel.create({
        bookingNumber: newBookingNumber(),
        customerId,
        customerSnapshot: { name: customer.name, phone: customer.phone },
        serviceType: b.serviceType,
        immediate: b.immediate,
        pickup: b.pickup,
        destination: b.destination,
        scheduledStart: b.scheduledStart,
        scheduledEnd: end,
        durationHours: b.durationHours,
        nights: b.nights,
        carModel: b.carModel,
        transmission: b.transmission,
        instructions: b.instructions,
        couponCode: b.couponCode?.toUpperCase(),
        status: "requested",
        fareEstimate: {
          total: estimate.total,
          lines: estimate.lines,
          usesUnconfirmedRules: estimate.usesUnconfirmedRules,
          computedAt: now,
          settingsVersion: version,
        },
        recurrence: b.recurrence,
        statusHistory: [{ from: null, to: "requested", actorId: customerId, actorKind: "customer", at: now }],
      });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  if (!booking) throw new AppError(500, "INTERNAL", "Could not create booking. Please try again.");

  if (coupon) {
    const ok = await consumeCoupon(coupon.code);
    if (!ok) {
      // Booking is kept but the coupon is no longer valid: reprice to standard and tell the customer.
      await booking.deleteOne();
      throw new AppError(400, "VALIDATION_ERROR", "Coupon code has been fully used. Please try again without it.", { couponCode: "exhausted" });
    }
    if (coupon.perCustomerLimit === 1) {
      const recorded = await recordRedemption({
        code: coupon.code,
        couponId: coupon.id,
        customerId,
        bookingId: booking._id as Types.ObjectId,
      });
      if (!recorded) {
        await booking.deleteOne();
        await releaseCouponUse(coupon.code);
        throw new AppError(400, "VALIDATION_ERROR", "You have already used this coupon.", { couponCode: "already_used" });
      }
    }
  }

  await audit({
    actorId: String(customerId),
    actorKind: "customer",
    action: "booking.create",
    entityType: "Booking",
    entityId: String(booking._id),
    after: { bookingNumber: booking.bookingNumber, total: estimate.total },
  });

  res.status(201).json(customerView(booking.toObject(), null));
});

/** Customer lists their own bookings only (FR-BOOK-04). */
bookingsRouter.get("/my", authenticate, requireCustomer, async (req, res) => {
  const list = await BookingModel.find({ customerId: req.principal!.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ items: list.map((b) => customerView(b, null)) });
});

/** Customer views one booking. Other customers get 404, not 403, so IDs are not confirmed (ID-enumeration safe). */
bookingsRouter.get("/:id", authenticate, requireCustomer, async (req, res) => {
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  const b = await BookingModel.findOne({ _id: String(String(req.params.id)), customerId: req.principal!.id }).lean();
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  const driver = b.driverId && ["driver_assigned", "driver_on_the_way", "in_progress", "completed"].includes(b.status)
    ? await DriverModel.findById(b.driverId).select("name phone").lean()
    : null;
  res.json(customerView(b, driver));
});

/** Customer requests a cancellation. The admin decides fees and refunds (confirmed). */
const cancelSchema = z.object({ reason: z.string().trim().min(3).max(500) });
bookingsRouter.post("/:id/cancel", authenticate, requireCustomer, validate(cancelSchema), async (req, res) => {
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  const b = await BookingModel.findOne({ _id: String(String(req.params.id)), customerId: req.principal!.id });
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  if (["completed", "cancelled", "rejected", "customer_no_show"].includes(b.status)) {
    throw new AppError(409, "CONFLICT", `This booking can no longer be cancelled (status: ${b.status}).`);
  }
  // Requesting twice is idempotent: a repeat POST updates the pending request
  // (e.g. corrected reason) and restarts the decision cycle. The audit log
  // keeps every request, so nothing is lost.
  const reason = (req.body as z.infer<typeof cancelSchema>).reason;
  const prior = { ...(b.cancellation ?? {}) } as Record<string, unknown>;
  delete prior.decidedBy;
  delete prior.decidedAt;
  b.cancellation = { ...prior, requestedAt: new Date(), requestReason: reason } as typeof b.cancellation;
  b.version += 1;
  await b.save();
  await audit({
    actorId: req.principal!.id,
    actorKind: "customer",
    action: "booking.cancel_requested",
    entityType: "Booking",
    entityId: String(b._id),
    reason,
  });
  res.status(202).json({ status: "cancellation_requested", bookingNumber: b.bookingNumber });
});

/**
 * What a customer may see. Internal fields (contact log, override reasons, fare-adjustment
 * notes, driver id) are removed. Driver contact details are shown only after assignment.
 */
export function customerView(b: Record<string, any>, driver: { name?: string; phone?: string } | null) {
  return {
    id: String(b._id),
    bookingNumber: b.bookingNumber,
    serviceType: b.serviceType,
    status: b.status as BookingStatus,
    pickup: { address: b.pickup?.address },
    destination: b.destination ? { address: b.destination.address } : undefined,
    scheduledStart: b.scheduledStart,
    scheduledEnd: b.scheduledEnd,
    durationHours: b.durationHours,
    nights: b.nights,
    carModel: b.carModel,
    transmission: b.transmission,
    instructions: b.instructions,
    estimate: b.fareEstimate
      ? { total: b.fareEstimate.total, lines: b.fareEstimate.lines, isEstimate: true, usesUnconfirmedRules: b.fareEstimate.usesUnconfirmedRules }
      : undefined,
    finalFare: b.finalFare ?? undefined,
    driver: driver ? { name: driver.name, phone: driver.phone } : undefined,
    recurrence: b.recurrence,
    cancellationRequested: Boolean(b.cancellation?.requestedAt),
    cancellationPending: Boolean(b.cancellation?.requestedAt && !b.cancellation?.decidedAt),
    cancelRequestReason: b.cancellation?.requestReason ?? undefined,
    createdAt: b.createdAt,
  };
}
