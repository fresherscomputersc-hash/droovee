import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { BookingModel, RatingModel } from "../models";
import { authenticate, requireCustomer } from "../middleware/auth";
import { validate } from "../lib/validate";
import { AppError } from "../lib/errors";
import { audit } from "../lib/audit";

export const ratingsRouter = Router();

const rateSchema = z.object({
  bookingId: z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid booking."),
  stars: z.number().int().min(1).max(5),
  review: z.string().trim().max(1000).optional(),
});

/** Customer rates a completed trip (once per booking). Low ratings alert the owner via /admin/alerts. */
ratingsRouter.post("/", authenticate, requireCustomer, validate(rateSchema), async (req, res) => {
  const { bookingId, stars, review } = req.body as z.infer<typeof rateSchema>;
  const b = await BookingModel.findOne({ _id: bookingId, customerId: req.principal!.id }).lean();
  if (!b) throw new AppError(404, "NOT_FOUND", "Booking not found.");
  if (b.status !== "completed") throw new AppError(409, "CONFLICT", "You can rate a trip after it is completed.");
  if (!b.driverId) throw new AppError(409, "CONFLICT", "No driver on this booking.");
  const exists = await RatingModel.exists({ bookingId: b._id });
  if (exists) throw new AppError(409, "CONFLICT", "You have already rated this trip.");
  const r = await RatingModel.create({
    bookingId: b._id,
    customerId: new Types.ObjectId(req.principal!.id),
    driverId: b.driverId,
    stars,
    review,
  });
  await audit({ actorId: req.principal!.id, actorKind: "customer", action: stars <= 2 ? "rating.low" : "rating.create", entityType: "Rating", entityId: String(r._id), after: { stars, bookingNumber: b.bookingNumber } });
  res.status(201).json({ id: String(r._id), stars });
});

/** Public recent reviews for the website (latest with text, customer anonymised). */
ratingsRouter.get("/recent", async (_req, res) => {
  const items = await RatingModel.find({ review: { $exists: true, $ne: "" } })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("bookingId", "serviceType")
    .lean();
  res.json({
    items: items.map((r: Record<string, any>) => ({
      stars: r.stars,
      review: r.review,
      serviceType: (r.bookingId as { serviceType?: string } | null)?.serviceType,
      at: (r as { createdAt?: Date }).createdAt,
    })),
  });
});
