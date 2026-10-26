import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import { randomUUID } from "crypto";
import { authRouter } from "./routes/auth";
import { pricingRouter, SERVICE_TYPES } from "./routes/pricing";
import { bookingsRouter } from "./routes/bookings";
import { adminRouter } from "./routes/admin";
import { driverRouter } from "./routes/driver";
import { ratingsRouter } from "./routes/ratings";
import { errorHandler, AppError } from "./lib/errors";
import { getActiveSettings } from "./services/settings";
import { globalLimiter, authLimiter, adminLimiter } from "./lib/rateLimit";
import { authenticate } from "./middleware/auth";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers["x-request-id"] as string) || randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);
    // Minimal security headers for an API. Front-ends set their own via Next.js.
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/api/v1/health", async (_req, res) => {
    try {
      const mongoose = await import("mongoose");
      const state = mongoose.default.connection.readyState; // 1 = connected
      if (state !== 1) throw new Error("db not connected");
      await mongoose.default.connection.db?.admin().ping();
      res.json({ status: "ok", db: "up" });
    } catch {
      res.status(503).json({ status: "degraded", db: "down" });
    }
  });

  // Layered limits: global backstop, strict auth bucket, staff backstop.
  app.use("/api/v1", globalLimiter());
  // Integration tests make many auth calls from one IP; keep their rate limit
  // deterministic without weakening the production auth bucket.
  const authLimit = process.env.NODE_ENV === "test" ? (_req: Request, _res: Response, next: NextFunction) => next() : authLimiter();
  app.use("/api/v1/auth", authLimit, authRouter);

  app.use("/api/v1/pricing", pricingRouter);

  // Pricing is private to signed-in customers and staff. The catalogue still
  // lives here so the booking, pricing and receipt screens share one source.
  app.get("/api/v1/services", authenticate, async (_req, res) => {
    const { version, settings } = await getActiveSettings();
    // Authenticated responses must never be cached by a shared CDN.
    res.setHeader("Cache-Control", "private, no-store");
    res.json({
      settingsVersion: version,
      services: SERVICE_TYPES.map((t) => ({ type: t, rates: settings.pricing.services[t] })),
      packages: (settings.pricing.packages ?? []).filter((p) => p.active),
      fees: {
        additionalHourRate: settings.pricing.additionalHourRate.value,
        lateNightSurcharge: settings.pricing.lateNightSurcharge.value,
        lateNightWindow: settings.pricing.lateNightWindow.value,
        nightHaltRate: settings.pricing.nightHaltRate.value,
      },
      invoice: settings.pricing.invoice ?? { gstin: { value: "" }, gstRate: { value: 18 } },
    });
  });

  /** Public business profile: insurance cover, address, support target. */
  app.get("/api/v1/business", async (_req, res) => {
    const { BusinessModel } = await import("./models");
    const b = await BusinessModel.findOne().sort({ updatedAt: -1 }).lean();
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    if (!b) return res.json({});
    res.json({
      name: b.name,
      address: b.address,
      insuranceProvider: b.insuranceProvider,
      insuranceCoverageNote: b.insuranceCoverageNote,
      supportReplyTarget: b.supportReplyTarget,
    });
  });

  app.use("/api/v1/bookings", bookingsRouter);
  app.use("/api/v1/admin", adminLimiter(), adminRouter);
  app.use("/api/v1/driver", driverRouter);
  app.use("/api/v1/ratings", ratingsRouter);
  // Driver-uploaded car photos (pre-trip dispute protection).
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"), {
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    }),
  );

  app.use((_req, _res, next) => next(new AppError(404, "NOT_FOUND", "Endpoint not found.")));
  app.use(errorHandler);
  return app;
}
