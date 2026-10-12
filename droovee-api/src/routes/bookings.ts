import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { BookingModel, CustomerModel, DriverModel } from "../models";
import { authenticate, requireCustomer } from "../middleware/auth";
import { validate, validateQuery } from "../lib/validate";
import { AppError } from "../lib/errors";
import { newBookingNumber, normalisePhone } from "../lib/ids";
import { audit } from "../lib/audit";
import { estimateFare } from "../domain/pricing";
import type { ServiceType } from "../domain/pricing";
import { bookingEnd } from "../domain/availability";
import { getActiveSettings } from "../services/settings";
import { validateCoupon, consumeCoupon, assertCouponMinAmount, alreadyRedeemed, recordRedemption, releaseCouponUse, type ValidCoupon } from "../services/coupons";
import { SERVICE_TYPES } from "./pricing";
import { bookingCreateLimiter, estimateLimiter } from "../lib/rateLimit";
import { BookingStatus } from "../domain/status";
import { config } from "../config";
import { verifyOtp } from "../services/otp";
import { sendMail, bookingConfirmationMail } from "../services/mail";
import { logNotification } from "../services/notify";
import { ensureReferralCode, resolvePackage, resolveReferrer, recordReferral } from "../services/growth";
import type { Pkg } from "../domain/settings";

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
    packageId: z.string().trim().max(40).optional(),
    referralCode: z.string().trim().max(12).optional(),
    recurrence: recurrenceSchema.optional(),
    agreedToTerms: z.literal(true, { message: "Please accept the Terms and Cancellation policy." }).optional(),
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

  // Fixed-price package (Phase 4): fare comes from settings, not the form. No coupon combo.
  let pkg: Pkg | undefined;
  if (b.packageId) {
    if (coupon) throw new AppError(400, "VALIDATION_ERROR", "A package cannot be combined with a coupon.", { couponCode: "no_combo" });
    pkg = resolvePackage(settings, b.packageId);
    if (!(SERVICE_TYPES as readonly string[]).includes(pkg.serviceType)) {
      throw new AppError(400, "VALIDATION_ERROR", "This package is misconfigured.", { packageId: "invalid" });
    }
  }

  const fareInput = pkg
    ? { serviceType: pkg.serviceType as ServiceType, durationHours: pkg.durationHours, startAt: b.scheduledStart, nights: pkg.nights ?? 0 }
    : {
    serviceType: b.serviceType,
    durationHours: b.durationHours,
    startAt: b.scheduledStart,
    nights: b.nights,
  };
  const base = estimateFare(fareInput as never, settings);
  if (coupon) assertCouponMinAmount(coupon, base.total);
  const estimate = pkg
    ? { total: pkg.fixedPrice, lines: [{ label: `Package: ${pkg.name}`, amount: pkg.fixedPrice }], usesUnconfirmedRules: false }
    : coupon?.type === "first_hour_price" ? estimateFare({ ...fareInput, firstHourCouponPrice: coupon.value }, settings) : base;

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
        packageId: pkg?.id,
        referralCode: b.referralCode?.toUpperCase(),
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
        agreedToTerms: true,
      });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  if (!booking) throw new AppError(500, "INTERNAL", "Could not create booking. Please try again.");
  await ensureReferralCode(customerId);
  if (b.referralCode) {
    const referrer = await resolveReferrer(b.referralCode, customerId);
    await recordReferral(b.referralCode, referrer._id as Types.ObjectId, customerId, booking._id as Types.ObjectId);
  }

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

  if (customer.email) {
    const { subject, text } = bookingConfirmationMail({
      bookingNumber: booking.bookingNumber,
      name: customer.name,
      serviceType: b.serviceType,
      start: b.scheduledStart,
      pickup: b.pickup.address,
      total: estimate.total,
    });
    sendMail(customer.email, subject, text)
      .then((sent) => logNotification(booking._id as Types.ObjectId, "received", "email", customer.email!, sent, sent ? undefined : "smtp not configured or send failed"))
      .catch(() => {});
  }

  res.status(201).json(customerView(booking.toObject(), null));
});

/** Public tracking by booking ID or mobile number — either one works (no account needed).
 * NOTE: registered before /:id, else "track" matches :id. */
const trackQuery = z
  .object({
    bookingNumber: z.string().trim().min(4).max(20).optional(),
    phone: z.string().trim().min(6).max(20).optional(),
  })
  .superRefine((q, ctx) => {
    if (!q.bookingNumber && !q.phone) {
      ctx.addIssue({ code: "custom", message: "Enter a booking ID or a mobile number." });
    }
  });
async function driverFor(b: { driverId?: unknown; status: string }) {
  return b.driverId && ["driver_assigned", "driver_on_the_way", "in_progress", "completed"].includes(b.status)
    ? await DriverModel.findById(b.driverId as string).select("name phone photoUrl experienceYears languages").lean()
    : null;
}
bookingsRouter.get("/track", estimateLimiter(), validateQuery(trackQuery), async (req, res) => {
  const q = (req as unknown as { validatedQuery: z.infer<typeof trackQuery> }).validatedQuery;
  // Booking ID alone: IDs are non-guessable (DRV-XXXXXXXX), safe to return.
  if (q.bookingNumber && !q.phone) {
    const b = await BookingModel.findOne({ bookingNumber: q.bookingNumber.trim().toUpperCase() }).lean();
    if (!b) throw new AppError(404, "NOT_FOUND", "We couldn't find that booking.");
    res.json(customerView(b as unknown as Record<string, unknown>, await driverFor(b as { driverId?: unknown; status: string })));
    return;
  }
  const phone = normalisePhone(q.phone ?? "");
  if (!phone) throw new AppError(400, "VALIDATION_ERROR", "Enter a valid Indian mobile number.", { phone: "invalid" });
  // Phone alone: list this number's bookings (newest first). Phone numbers are
  // personal but not secret; only the limited customer view is returned.
  if (!q.bookingNumber) {
    const list = await BookingModel.find({
      $or: [{ "customerSnapshot.phone": phone }, { altContact: q.phone!.trim() }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    if (!list.length) throw new AppError(404, "NOT_FOUND", "No bookings found for this number.");
    res.json({ items: list.map((b) => customerView(b as unknown as Record<string, unknown>, null)) });
    return;
  }
  // Both: single booking, phone must match (strictest check).
  const b = await BookingModel.findOne({ bookingNumber: q.bookingNumber.trim().toUpperCase() }).lean();
  if (!b) throw new AppError(404, "NOT_FOUND", "We couldn't find that booking.");
  const snapshotPhone = normalisePhone(String((b.customerSnapshot as { phone?: string })?.phone ?? ""));
  const altPhone = (b as Record<string, unknown>).altContact ? normalisePhone(String((b as Record<string, unknown>).altContact)) : null;
  if (snapshotPhone !== phone && altPhone !== phone) {
    throw new AppError(404, "NOT_FOUND", "We couldn't find that booking.");
  }
  res.json(customerView(b as unknown as Record<string, unknown>, await driverFor(b as { driverId?: unknown; status: string })));
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
    ? await DriverModel.findById(b.driverId).select("name phone photoUrl experienceYears languages").lean()
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

/** Fast Booking (guest, no sign-in). PDF Phase 1 §3.1. */
const guestSchema = bookingSchema.extend({
  name: z.string().trim().min(2).max(120),
  phone: z.string().transform((v, ctx) => {
    const n = normalisePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Enter a valid Indian mobile number." });
    return n ?? "";
  }),
  otp: z.string().regex(/^\d{6}$/).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  landmark: z.string().trim().max(300).optional(),
  carNumber: z.string().trim().max(20).optional(),
  altContact: z.string().trim().max(20).optional(),
  driverLanguage: z.enum(["odia", "hindi", "english"]).optional(),
  paymentPreference: z.enum(["online", "cash_upi"]),
  email: z.email().trim().toLowerCase().optional(), // booking confirmation goes here
  agreedToTerms: z.literal(true, { message: "Please accept the Terms and Cancellation policy." }),
  company: z.string().max(100).optional(), // honeypot
});
bookingsRouter.post("/guest", bookingCreateLimiter(), validate(guestSchema), async (req, res) => {
  const b = req.body as z.infer<typeof guestSchema>;
  if (b.company) {
    // Honeypot filled: pretend success without creating anything.
    throw new AppError(400, "VALIDATION_ERROR", "Could not submit your booking. Please try again.");
  }
  if (config.otpEnabled) {
    if (!b.otp) throw new AppError(400, "VALIDATION_ERROR", "Enter the 6-digit code sent to your mobile.", { otp: "required" });
    await verifyOtp(b.phone, "guest_booking", b.otp);
  }
  // Spam guard: max 5 guest bookings per number per hour.
  const hourAgo = new Date(Date.now() - 60 * 60_000);
  const recent = await BookingModel.countDocuments({
    "customerSnapshot.phone": b.phone,
    createdAt: { $gte: hourAgo },
  });
  if (recent >= 5) throw new AppError(429, "RATE_LIMITED", "Too many bookings from this number. Try again later.");

  let customer = await CustomerModel.findOne({ phone: b.phone });
  // Email is unique per account: if this email belongs to a different phone,
  // leave the customer record alone (confirmation still goes to the typed email).
  const emailTakenElsewhere = b.email
    ? await CustomerModel.exists({ email: b.email, phone: { $ne: b.phone } })
    : null;
  if (!customer) {
    try {
      customer = await CustomerModel.create({
        name: b.name,
        phone: b.phone,
        email: emailTakenElsewhere ? undefined : b.email,
        phoneVerified: config.otpEnabled,
        active: true,
      });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        customer = (await CustomerModel.findOne({ phone: b.phone }))!;
      } else throw e;
    }
  } else {
    let save = false;
    if (config.otpEnabled && !customer.phoneVerified) {
      customer.phoneVerified = true;
      save = true;
    }
    if (b.email && !customer.email && !emailTakenElsewhere) {
      customer.email = b.email;
      save = true;
    }
    if (save) {
      try {
        await customer.save();
      } catch (e) {
        if ((e as { code?: number }).code !== 11000) throw e;
      }
    }
  }
  const customerId = customer._id as Types.ObjectId;

  const { version, settings } = await getActiveSettings();
  const now = new Date();
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

  let coupon: ValidCoupon | undefined;
  if (b.couponCode) {
    coupon = await validateCoupon(b.couponCode, b.serviceType, now);
    if (coupon.perCustomerLimit === 1 && (await alreadyRedeemed(coupon.code, customerId))) {
      throw new AppError(400, "VALIDATION_ERROR", "You have already used this coupon.", { couponCode: "already_used" });
    }
  }
  let pkg: Pkg | undefined;
  if (b.packageId) {
    if (coupon) throw new AppError(400, "VALIDATION_ERROR", "A package cannot be combined with a coupon.", { couponCode: "no_combo" });
    pkg = resolvePackage(settings, b.packageId);
    if (!(SERVICE_TYPES as readonly string[]).includes(pkg.serviceType)) {
      throw new AppError(400, "VALIDATION_ERROR", "This package is misconfigured.", { packageId: "invalid" });
    }
  }
  const fareInput = pkg
    ? { serviceType: pkg.serviceType as ServiceType, durationHours: pkg.durationHours, startAt: b.scheduledStart, nights: pkg.nights ?? 0 }
    : { serviceType: b.serviceType, durationHours: b.durationHours, startAt: b.scheduledStart, nights: b.nights };
  const base = estimateFare(fareInput as never, settings);
  if (coupon) assertCouponMinAmount(coupon, base.total);
  const estimate = pkg
    ? { total: pkg.fixedPrice, lines: [{ label: `Package: ${pkg.name}`, amount: pkg.fixedPrice }], usesUnconfirmedRules: false }
    : coupon?.type === "first_hour_price" ? estimateFare({ ...fareInput, firstHourCouponPrice: coupon.value }, settings) : base;

  let booking;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    try {
      booking = await BookingModel.create({
        bookingNumber: newBookingNumber(),
        customerId,
        customerSnapshot: { name: b.name, phone: b.phone },
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
        packageId: pkg?.id,
        referralCode: b.referralCode?.toUpperCase(),
        status: "requested",
        fareEstimate: { total: estimate.total, lines: estimate.lines, usesUnconfirmedRules: estimate.usesUnconfirmedRules, computedAt: now, settingsVersion: version },
        recurrence: b.recurrence,
        statusHistory: [{ from: null, to: "requested", actorId: customerId, actorKind: "customer", at: now }],
        isGuest: true,
        guestWhatsapp: b.whatsapp,
        guestEmail: b.email,
        landmark: b.landmark,
        carNumber: b.carNumber,
        altContact: b.altContact,
        driverLanguage: b.driverLanguage,
        paymentPreference: b.paymentPreference,
        agreedToTerms: true,
        source: "website",
      });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  if (!booking) throw new AppError(500, "INTERNAL", "Could not create booking. Please try again.");
  await ensureReferralCode(customerId);
  if (b.referralCode) {
    const referrer = await resolveReferrer(b.referralCode, customerId);
    await recordReferral(b.referralCode, referrer._id as Types.ObjectId, customerId, booking._id as Types.ObjectId);
  }

  if (coupon) {
    const ok = await consumeCoupon(coupon.code);
    if (!ok) {
      await booking.deleteOne();
      throw new AppError(400, "VALIDATION_ERROR", "Coupon code has been fully used. Please try again without it.", { couponCode: "exhausted" });
    }
    if (coupon.perCustomerLimit === 1) {
      const recorded = await recordRedemption({ code: coupon.code, couponId: coupon.id, customerId, bookingId: booking._id as Types.ObjectId });
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
    action: "booking.create_guest",
    entityType: "Booking",
    entityId: String(booking._id),
    after: { bookingNumber: booking.bookingNumber, total: estimate.total },
  });

  // Confirmation email (SMTP). Fire-and-forget: booking succeeds even if mail fails.
  if (b.email) {
    const { subject, text } = bookingConfirmationMail({
      bookingNumber: booking.bookingNumber,
      name: b.name,
      serviceType: b.serviceType,
      start: b.scheduledStart,
      pickup: b.pickup.address,
      total: estimate.total,
    });
    sendMail(b.email, subject, text)
      .then((sent) => logNotification(booking._id as Types.ObjectId, "received", "email", b.email!, sent, sent ? undefined : "smtp not configured or send failed"))
      .catch(() => {});
  }

  res.status(201).json(customerView(booking.toObject(), null));
});

/**
 * What a customer may see. Internal fields (contact log, override reasons, fare-adjustment
 * notes, driver id) are removed. Driver contact details are shown only after assignment.
 */
export function customerView(b: Record<string, any>, driver: { name?: string | null; phone?: string | null; photoUrl?: string | null; experienceYears?: number | null; languages?: string[] | null } | null) {
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
    driver: driver ? { name: driver.name, phone: driver.phone, photoUrl: driver.photoUrl, experienceYears: driver.experienceYears, languages: driver.languages } : undefined,
    shareToken: (b as Record<string, unknown>).shareToken ?? undefined,
    tripEnded: Boolean(b.tripEndedByDriverAt),
    driverArrived: Boolean(b.driverArrivedAt),
    photoCount: Array.isArray(b.carPhotos) ? b.carPhotos.length : 0,
    recurrence: b.recurrence,
    cancellationRequested: Boolean(b.cancellation?.requestedAt),
    cancellationPending: Boolean(b.cancellation?.requestedAt && !b.cancellation?.decidedAt),
    cancelRequestReason: b.cancellation?.requestReason ?? undefined,
    createdAt: b.createdAt,
  };
}
