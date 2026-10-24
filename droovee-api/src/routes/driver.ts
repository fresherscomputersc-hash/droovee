import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { BookingModel } from "../models";
import { validate, validateQuery } from "../lib/validate";
import { AppError } from "../lib/errors";
import { audit } from "../lib/audit";
import { hmac, safeEqualHex, signAccess } from "../lib/tokens";
import { notifyBookingEvent } from "../services/notify";
import { normalisePhone } from "../lib/ids";

import { randomUUID } from "crypto";
import { driverLimiter, driverLoginLimiter } from "../lib/rateLimit";
import { authenticateDriver } from "../middleware/auth";
import { clearDriverCookie, setDriverCookie } from "../lib/cookies";
import { config } from "../config";
import { canTransition, BookingStatus } from "../domain/status";

export const driverRouter = Router();
driverRouter.use(driverLimiter());

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "car-photos");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = EXT_MAP[file.mimetype] || ".jpg";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!EXT_MAP[file.mimetype]) return cb(new AppError(400, "VALIDATION_ERROR", "Only JPG, PNG or WebP photos."));
    cb(null, true);
  },
});

async function loadJob(token: string) {
  const b = await BookingModel.findOne({ driverTokenHash: hmac(`driver|${token}`) }).select(
    "+driverTokenHash +tripCodeStartHash +tripCodeEndHash",
  );
  if (!b) throw new AppError(404, "NOT_FOUND", "This driver link is invalid. Ask the Droovee team for a new one.");
  return b;
}

function jobView(b: Record<string, any>, driver: { name?: string; phone?: string } | null) {
  return {
    bookingNumber: b.bookingNumber,
    status: b.status,
    serviceType: b.serviceType,
    scheduledStart: b.scheduledStart,
    scheduledEnd: b.scheduledEnd,
    pickup: b.pickup,
    destination: b.destination,
    customer: b.customerSnapshot,
    carModel: b.carModel,
    transmission: b.transmission,
    instructions: b.instructions,
    driverConfirmed: (b.contactLog ?? []).some((c: { result?: string }) => c.result === "confirmed"),
    driverArrived: Boolean(b.driverArrivedAt),
    tripEnded: Boolean(b.tripEndedByDriverAt),
    photoCount: Array.isArray(b.carPhotos) ? b.carPhotos.length : 0,
    driver,
  };
}

/** Driver opens their job link (no app, no login). */
driverRouter.get("/j/:token", async (req, res) => {
  const b = await loadJob(String(req.params.token));
  const { DriverModel } = await import("../models");
  const driver = b.driverId ? await DriverModel.findById(b.driverId).select("name phone").lean() : null;
  res.json(jobView(b.toObject(), driver));
});

/** Driver confirms the job. */
driverRouter.post("/j/:token/confirm", async (req, res) => {
  const b = await loadJob(String(req.params.token));
  if (!["driver_assigned"].includes(b.status)) {
    throw new AppError(409, "CONFLICT", `This job is already ${b.status}.`);
  }
  b.contactLog.push({ channel: "whatsapp", result: "confirmed", notes: "Driver confirmed via link", actorId: b.driverId, at: new Date() } as never);
  b.version += 1;
  await b.save();
  await audit({ actorKind: "system", action: "driver.confirm", entityType: "Booking", entityId: String(b._id), reason: "driver link" });
  res.json({ status: b.status, driverConfirmed: true });
});

/** Driver marks on-the-way (needs prior confirmation, like staff flow). */
driverRouter.post("/j/:token/on-the-way", async (req, res) => {
  const b = await loadJob(String(req.params.token));
  if (b.status !== "driver_assigned") throw new AppError(409, "CONFLICT", `This job is ${b.status}.`);
  if (!b.contactLog.some((c) => c.result === "confirmed")) {
    throw new AppError(409, "CONFLICT", "Confirm the job first.");
  }
  b.status = "driver_on_the_way";
  b.statusHistory.push({ from: "driver_assigned", to: "driver_on_the_way", actorId: b.driverId, actorKind: "system", at: new Date() } as never);
  b.version += 1;
  await b.save();
  await audit({ actorKind: "system", action: "driver.on_the_way", entityType: "Booking", entityId: String(b._id), reason: "driver link" });
  notifyBookingEvent(String(b._id), "driver_on_the_way").catch(() => {});
  res.json({ status: b.status });
});

/** Driver marks arrived at pickup (visible to customer + family share). */
driverRouter.post("/j/:token/arrived", async (req, res) => {
  const b = await loadJob(String(req.params.token));
  if (!["driver_assigned", "driver_on_the_way"].includes(b.status)) {
    throw new AppError(409, "CONFLICT", `This job is ${b.status}.`);
  }
  b.driverArrivedAt = new Date() as never;
  b.version += 1;
  await b.save();
  await audit({ actorKind: "system", action: "driver.arrived", entityType: "Booking", entityId: String(b._id), reason: "driver link" });
  res.json({ status: b.status, driverArrived: true });
});

const codeSchema = z.object({ code: z.string().regex(/^\d{4}$/, "Enter the 4-digit code from the customer.") });

/** Driver starts the trip with the START code from the customer. */
driverRouter.post("/j/:token/start", validate(codeSchema), async (req, res) => {
  const b = await loadJob(String(req.params.token));
  if (b.status !== "driver_on_the_way") throw new AppError(409, "CONFLICT", `Mark on-the-way first (current: ${b.status}).`);
  const { code } = req.body as z.infer<typeof codeSchema>;
  if (!b.tripCodeStartHash || !safeEqualHex(String(b.tripCodeStartHash), hmac(`trip-start|${code}`))) {
    throw new AppError(400, "VALIDATION_ERROR", "Wrong START code. Ask the customer to read it again.", { code: "incorrect" });
  }
  b.status = "in_progress";
  b.statusHistory.push({ from: "driver_on_the_way", to: "in_progress", actorId: b.driverId, actorKind: "system", at: new Date() } as never);
  b.version += 1;
  await b.save();
  await audit({ actorKind: "system", action: "driver.start", entityType: "Booking", entityId: String(b._id), reason: "start code verified" });
  notifyBookingEvent(String(b._id), "in_progress").catch(() => {});
  res.json({ status: b.status });
});

/** Driver ends the trip with the END code. Admin completes with the final fare. */
driverRouter.post("/j/:token/end", validate(codeSchema), async (req, res) => {
  const b = await loadJob(String(req.params.token));
  if (b.status !== "in_progress") throw new AppError(409, "CONFLICT", `Start the trip first (current: ${b.status}).`);
  const { code } = req.body as z.infer<typeof codeSchema>;
  if (!b.tripCodeEndHash || !safeEqualHex(String(b.tripCodeEndHash), hmac(`trip-end|${code}`))) {
    throw new AppError(400, "VALIDATION_ERROR", "Wrong END code. Ask the customer to read it again.", { code: "incorrect" });
  }
  b.tripEndedByDriverAt = new Date() as never;
  b.version += 1;
  await b.save();
  await audit({ actorKind: "system", action: "driver.end", entityType: "Booking", entityId: String(b._id), reason: "end code verified" });
  res.json({ status: b.status, tripEnded: true });
});

/** Driver uploads pre-trip car photos (dispute protection). */
driverRouter.post("/j/:token/photos", (req, res, next) => {
  upload.array("photos", 8)(req, res, (err: unknown) => {
    if (err) return next(err instanceof AppError ? err : new AppError(400, "VALIDATION_ERROR", (err as Error).message ?? "Upload failed."));
    next();
  });
}, async (req, res) => {
  const b = await loadJob(String(req.params.token));
  const files = (req.files ?? []) as Express.Multer.File[];
  if (!files.length) throw new AppError(400, "VALIDATION_ERROR", "Choose at least one photo.");
  const existing = Array.isArray(b.carPhotos) ? b.carPhotos : [];
  if (existing.length + files.length > 12) {
    for (const f of files) fs.unlink(f.path, () => {});
    throw new AppError(400, "VALIDATION_ERROR", "Maximum 12 photos per trip.");
  }
  const now = new Date();
  b.carPhotos = [...existing, ...files.map((f) => ({ url: `/uploads/car-photos/${path.basename(f.path)}`, takenAt: now }))] as never;
  b.version += 1;
  await b.save();
  await audit({ actorKind: "system", action: "driver.photos", entityType: "Booking", entityId: String(b._id), reason: `${files.length} photo(s)` });
  res.status(201).json({ photoCount: (b.carPhotos as unknown[]).length, photos: b.carPhotos });
});

/** Family share-trip link (no login): driver name + live status only. */
driverRouter.get("/share/:token", async (req, res) => {
  const b = await BookingModel.findOne({ shareToken: String(req.params.token) }).lean();
  if (!b) throw new AppError(404, "NOT_FOUND", "This share link is invalid.");
  const { DriverModel } = await import("../models");
  const driver = b.driverId ? await DriverModel.findById(b.driverId).select("name photoUrl").lean() : null;
  res.json({
    bookingNumber: b.bookingNumber,
    status: b.status,
    serviceType: b.serviceType,
    scheduledStart: b.scheduledStart,
    driver: driver ? { name: driver.name, photoUrl: driver.photoUrl } : null,
    driverArrived: Boolean((b as Record<string, unknown>).driverArrivedAt),
    tripEnded: Boolean((b as Record<string, unknown>).tripEndedByDriverAt),
  });
});

/** Driver Mobile Portal — sign in with phone/employee code + 6-digit PIN. */
const driverLoginSchema = z.object({
  identifier: z.string().trim().min(2).max(40),
  pin: z.string().regex(/^\d{6}$/, "Enter the 6-digit portal PIN."),
});

driverRouter.post("/login", driverLoginLimiter(), validate(driverLoginSchema), async (req, res) => {
  const { identifier, pin } = req.body as z.infer<typeof driverLoginSchema>;
  const { DriverModel } = await import("../models");
  const phone = normalisePhone(identifier);
  const code = identifier.trim().toUpperCase();

  // Exact matches only: no user-supplied regex and no display-name lookup, so
  // there is no ReDoS/pattern-injection surface and names cannot enumerate accounts.
  const driver = await DriverModel.findOne({
    $or: [...(phone ? [{ phone }] : []), { employeeCode: code }],
    employmentStatus: { $ne: "suspended" },
  })
    .select("+portalPinHash")
    .lean();

  // Always run bcrypt so an unknown identifier and a wrong PIN take the same time.
  const hash = driver?.portalPinHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const pinOk = await bcrypt.compare(pin, hash);

  if (!driver || !driver.portalPinHash || !pinOk) {
    throw new AppError(401, "UNAUTHENTICATED", "Driver not found or PIN is incorrect.");
  }
  if (driver.employmentStatus !== "active") {
    throw new AppError(403, "FORBIDDEN", "Driver account is not active. Contact dispatch.");
  }

  const accessToken = signAccess(
    { sub: String(driver._id), kind: "driver", v: driver.tokenVersion ?? 0 },
    config.driverTokenTtlSeconds,
  );
  setDriverCookie(res, accessToken);

  res.json({
    driver: {
      id: String(driver._id),
      employeeCode: driver.employeeCode,
      name: driver.name,
      phone: driver.phone,
      experienceYears: driver.experienceYears,
      languages: driver.languages,
    },
  });
});

/** Driver Mobile Portal — current session profile (cookie or bearer token). */
driverRouter.get("/me", authenticateDriver, async (req, res) => {
  const { DriverModel } = await import("../models");
  const d = await DriverModel.findById(req.driver!.id).select("employeeCode name phone experienceYears languages").lean();
  if (!d) throw new AppError(404, "NOT_FOUND", "Driver not found.");
  res.json({
    driver: {
      id: String(d._id),
      employeeCode: d.employeeCode,
      name: d.name,
      phone: d.phone,
      experienceYears: d.experienceYears,
      languages: d.languages,
    },
  });
});

/** Driver Mobile Portal — sign out (clears the driver cookie). */
driverRouter.post("/logout", (_req, res) => {
  clearDriverCookie(res);
  res.status(204).end();
});

/** Driver Mobile Portal — list the signed-in driver's assigned trips. */
driverRouter.get("/portal/jobs", authenticateDriver, async (req, res) => {
  const bookings = await BookingModel.find({ driverId: new Types.ObjectId(req.driver!.id) })
    .sort({ scheduledStart: -1 })
    .limit(50)
    .lean();

  const { PaymentModel } = await import("../models");
  const bookingIds = bookings.map((b) => b._id);
  const payments = await PaymentModel.find({ bookingId: { $in: bookingIds } }).lean();

  const items = bookings.map((b) => {
    const tripPayments = payments.filter((p) => String(p.bookingId) === String(b._id));
    const cashCollected = tripPayments.some((p) => p.method === "cash" && p.status === "succeeded");
    const confirmed = (b.contactLog ?? []).some((c: { result?: string }) => c.result === "confirmed");

    return {
      id: String(b._id),
      bookingNumber: b.bookingNumber,
      status: b.status,
      serviceType: b.serviceType,
      scheduledStart: b.scheduledStart,
      scheduledEnd: b.scheduledEnd,
      durationHours: b.durationHours,
      pickup: b.pickup,
      destination: b.destination,
      customer: b.customerSnapshot,
      altContact: (b as Record<string, unknown>).altContact,
      carModel: b.carModel,
      transmission: b.transmission,
      instructions: b.instructions,
      finalFare: b.finalFare ?? b.fareEstimate?.total,
      driverConfirmed: confirmed,
      driverArrived: Boolean((b as Record<string, unknown>).driverArrivedAt),
      tripEnded: Boolean((b as Record<string, unknown>).tripEndedByDriverAt),
      photoCount: Array.isArray(b.carPhotos) ? b.carPhotos.length : 0,
      cashCollected,
    };
  });

  res.json({ items });
});

/** Driver Mobile Portal — milestone updates & cash collection. */
const portalActionSchema = z.object({
  action: z.enum(["confirm", "on-the-way", "arrived", "start", "end", "collect-cash"]),
  code: z.string().optional(),
  amount: z.number().optional(),
  notes: z.string().trim().max(200).optional(),
});

function assertTripCode(
  code: string | undefined,
  hash: string | null | undefined,
  prefix: "trip-start" | "trip-end",
) {
  const label = prefix === "trip-start" ? "START" : "END";
  if (!code || !/^\d{4}$/.test(code)) {
    throw new AppError(400, "VALIDATION_ERROR", `Enter the 4-digit ${label} code from the customer.`, { code: "required" });
  }
  if (!hash) {
    throw new AppError(409, "CONFLICT", `No ${label} code was issued for this trip. Contact dispatch.`);
  }
  if (!safeEqualHex(String(hash), hmac(`${prefix}|${code}`))) {
    throw new AppError(400, "VALIDATION_ERROR", `Wrong ${label} code. Ask the customer to read it again.`, { code: "incorrect" });
  }
}

driverRouter.post("/portal/jobs/:id/action", authenticateDriver, validate(portalActionSchema), async (req, res) => {
  const id = String(req.params.id);
  const { action, code, amount, notes } = req.body as z.infer<typeof portalActionSchema>;
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, "VALIDATION_ERROR", "Invalid booking id.");

  // The driver id comes from the signed session, never from the request body.
  const b = await BookingModel.findOne({
    _id: new Types.ObjectId(id),
    driverId: new Types.ObjectId(req.driver!.id),
  }).select("+tripCodeStartHash +tripCodeEndHash");

  if (!b) throw new AppError(404, "NOT_FOUND", "Trip assignment not found.");

  const now = new Date();
  const actor = { actorId: b.driverId, actorKind: "system" as const, at: now };
  const from = b.status as BookingStatus;

  if (action === "confirm") {
    if (b.status !== "driver_assigned") throw new AppError(409, "CONFLICT", `This job is ${b.status}.`);
    // Idempotent: a double-tap must not add a duplicate contact-log entry.
    if (!(b.contactLog ?? []).some((c) => c.result === "confirmed")) {
      b.contactLog.push({ channel: "whatsapp", result: "confirmed", notes: "Driver confirmed in driver portal", ...actor } as never);
      b.version += 1;
      await b.save();
      await audit({ actorKind: "system", action: "driver.confirm", entityType: "Booking", entityId: String(b._id), reason: "driver portal" });
    }
  } else if (action === "on-the-way") {
    if (!canTransition(from, "driver_on_the_way")) {
      throw new AppError(409, "CONFLICT", `Mark on-the-way from driver_assigned (current: ${b.status}).`);
    }
    if (!(b.contactLog ?? []).some((c) => c.result === "confirmed")) {
      throw new AppError(409, "CONFLICT", "Confirm the job first.");
    }
    b.status = "driver_on_the_way";
    b.statusHistory.push({ from, to: "driver_on_the_way", ...actor } as never);
    b.version += 1;
    await b.save();
    await audit({ actorKind: "system", action: "driver.on_the_way", entityType: "Booking", entityId: String(b._id), reason: "driver portal" });
    notifyBookingEvent(String(b._id), "driver_on_the_way").catch(() => {});
  } else if (action === "arrived") {
    if (!["driver_assigned", "driver_on_the_way"].includes(b.status)) {
      throw new AppError(409, "CONFLICT", `This job is ${b.status}.`);
    }
    if (!b.driverArrivedAt) {
      b.driverArrivedAt = now as never;
      b.version += 1;
      await b.save();
      await audit({ actorKind: "system", action: "driver.arrived", entityType: "Booking", entityId: String(b._id), reason: "driver portal" });
    }
  } else if (action === "start") {
    if (!canTransition(from, "in_progress")) {
      throw new AppError(409, "CONFLICT", `Mark on-the-way first (current: ${b.status}).`);
    }
    // A code is mandatory: a missing hash can no longer be bypassed.
    assertTripCode(code, b.tripCodeStartHash as string | undefined, "trip-start");
    b.status = "in_progress";
    b.statusHistory.push({ from, to: "in_progress", ...actor } as never);
    b.version += 1;
    await b.save();
    await audit({ actorKind: "system", action: "driver.start", entityType: "Booking", entityId: String(b._id), reason: "start code verified in portal" });
    notifyBookingEvent(String(b._id), "in_progress").catch(() => {});
  } else if (action === "end") {
    if (b.status !== "in_progress") throw new AppError(409, "CONFLICT", `Start the trip first (current: ${b.status}).`);
    if (b.tripEndedByDriverAt) {
      // Idempotent: the trip is already ended and awaiting the admin final fare.
      res.json({ success: true, status: b.status, tripEnded: true });
      return;
    }
    assertTripCode(code, b.tripCodeEndHash as string | undefined, "trip-end");
    // The driver only marks the trip ended. The admin completes it with the
    // final fare (the portal must not fabricate a completed fare).
    b.tripEndedByDriverAt = now as never;
    b.version += 1;
    await b.save();
    await audit({ actorKind: "system", action: "driver.end", entityType: "Booking", entityId: String(b._id), reason: "end code verified in portal; awaiting admin final fare" });
  } else if (action === "collect-cash") {
    if (!b.tripEndedByDriverAt) throw new AppError(409, "CONFLICT", "End the trip before recording cash.");
    if (b.status !== "in_progress" && b.status !== "completed") {
      throw new AppError(409, "CONFLICT", `Cash cannot be collected for a ${b.status} trip.`);
    }
    const { PaymentModel } = await import("../models");
    const existing = await PaymentModel.findOne({ bookingId: b._id, method: "cash", status: "succeeded" }).lean();
    if (existing) throw new AppError(409, "CONFLICT", "Cash is already recorded for this booking.");
    const fare = b.finalFare ?? b.fareEstimate?.total ?? 0;
    const collectAmount = amount ?? fare;
    if (!Number.isFinite(collectAmount) || collectAmount <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Enter a valid cash amount.");
    }
    if (fare > 0 && collectAmount > fare) {
      throw new AppError(400, "VALIDATION_ERROR", `Cash cannot exceed the trip fare of ₹${fare}.`);
    }
    // Atomic claim: a double-tap (or two tabs) cannot record two cash payments.
    const claimed = await BookingModel.findOneAndUpdate(
      { _id: b._id, "cashSettlement.collectedByDriver": { $ne: true } },
      {
        $set: {
          "cashSettlement.collectedByDriver": true,
          "cashSettlement.collectedAmount": collectAmount,
          "cashSettlement.collectedAt": now,
        },
        $inc: { version: 1 },
      },
      { new: false },
    );
    if (!claimed) throw new AppError(409, "CONFLICT", "Cash is already recorded for this booking.");
    try {
      await PaymentModel.create({
        bookingId: b._id,
        amount: collectAmount,
        currency: "INR",
        method: "cash",
        status: "succeeded",
        reference: notes || `Cash collected by driver (${b.bookingNumber})`,
        recordedAt: now,
      });
    } catch (e) {
      // Roll the claim back if the ledger write failed.
      await BookingModel.updateOne(
        { _id: b._id },
        {
          $set: { "cashSettlement.collectedByDriver": false },
          $unset: { "cashSettlement.collectedAmount": 1, "cashSettlement.collectedAt": 1 },
        },
      ).catch(() => {});
      throw e;
    }
    await audit({ actorKind: "system", action: "driver.collect_cash", entityType: "Booking", entityId: String(b._id), reason: `₹${collectAmount} cash collected by driver` });
  }

  res.json({ success: true, status: b.status, tripEnded: Boolean(b.tripEndedByDriverAt) });
});
