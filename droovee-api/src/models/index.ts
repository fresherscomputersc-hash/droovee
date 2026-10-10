import { Schema, model, Types, InferSchemaType } from "mongoose";
import { BOOKING_STATUSES } from "../domain/status";
import { STAFF_ROLES } from "../lib/permissions";

const opts = { timestamps: true, versionKey: false as const };

// ---------- Customers ----------
const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, unique: true }, // E.164 +91…
    email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
    passwordHash: { type: String, select: false },
    phoneVerified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    /** Bumped on disable/role/password changes: outstanding access tokens carry the old version and stop working. */
    tokenVersion: { type: Number, default: 0 },
  },
  opts,
);
export type Customer = InferSchemaType<typeof customerSchema> & { _id: Types.ObjectId };
export const CustomerModel = model("Customer", customerSchema);

// ---------- OTP (hashed, TTL-expired) ----------
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    purpose: { type: String, enum: ["login", "register", "verify_phone"], required: true },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OtpModel = model("Otp", otpSchema);

// ---------- Refresh sessions (hashed tokens, revocable) ----------
const sessionSchema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, required: true, index: true },
    subjectKind: { type: String, enum: ["customer", "staff"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    /** Rotation chain: all tokens derived from one login share it. Reuse of a dead token kills the chain. */
    familyId: { type: Schema.Types.ObjectId, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SessionModel = model("Session", sessionSchema);

// ---------- Staff accounts ----------
const staffSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: STAFF_ROLES, required: true },
    active: { type: Boolean, default: true },
    /** Bumped on disable/role/password changes: outstanding access tokens carry the old version and stop working. */
    tokenVersion: { type: Number, default: 0 },
  },
  opts,
);
export const StaffModel = model("Staff", staffSchema);

// ---------- Drivers (salaried employees) ----------
const driverSchema = new Schema(
  {
    employeeCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true },
    licenceNumber: { type: String, trim: true },
    licenceExpiresAt: { type: Date },
    employmentStatus: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    serviceZones: [{ type: String }],
    /**
     * Incremented inside every assignment transaction. Two concurrent assignments
     * for the same driver conflict on this document, so one of them aborts (409).
     */
    assignmentVersion: { type: Number, default: 0 },
  },
  opts,
);
export const DriverModel = model("Driver", driverSchema);

// ---------- Availability blocks (leave, unavailable periods) ----------
const availabilityBlockSchema = new Schema(
  {
    driverId: { type: Schema.Types.ObjectId, ref: "Driver", required: true, index: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    type: { type: String, enum: ["leave", "unavailable", "shift_off"], required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
  },
  opts,
);
availabilityBlockSchema.index({ driverId: 1, startAt: 1 });
export const AvailabilityBlockModel = model("AvailabilityBlock", availabilityBlockSchema);

// ---------- Bookings (source of truth for trips) ----------
const bookingSchema = new Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    customerSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    serviceType: {
      type: String,
      required: true,
      enum: [
        "hourly",
        "half_day",
        "full_day",
        "monthly_office",
        "outstation_one_way",
        "outstation_round_trip",
        "airport_pickup_drop",
      ],
    },
    immediate: { type: Boolean, default: false },
    pickup: {
      address: { type: String, required: true, maxlength: 300 },
      lat: Number,
      lng: Number,
      zoneId: String,
    },
    destination: {
      address: { type: String, maxlength: 300 },
      lat: Number,
      lng: Number,
    },
    scheduledStart: { type: Date, required: true, index: true },
    scheduledEnd: { type: Date, required: true },
    durationHours: { type: Number, required: true, min: 0.5 },
    nights: { type: Number, default: 0, min: 0 },
    carModel: { type: String, required: true, maxlength: 80 },
    transmission: { type: String, enum: ["manual", "automatic"], required: true },
    instructions: { type: String, maxlength: 1000, default: "" },
    status: { type: String, enum: BOOKING_STATUSES, default: "requested", index: true },
    driverId: { type: Schema.Types.ObjectId, ref: "Driver", index: true },
    couponCode: { type: String, uppercase: true, trim: true },
    recurrence: Schema.Types.Mixed,
    fareEstimate: {
      total: Number,
      lines: [{ label: String, amount: Number, _id: false }],
      usesUnconfirmedRules: Boolean,
      computedAt: Date,
      settingsVersion: Number,
    },
    finalFare: { type: Number },
    fareAdjustments: [
      {
        from: Number,
        to: Number,
        reason: { type: String, required: true },
        actorId: Schema.Types.ObjectId,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    contactLog: [
      {
        channel: { type: String, enum: ["call", "whatsapp"], required: true },
        result: { type: String, enum: ["not_contacted", "contacted", "confirmed", "declined", "unreachable"], required: true },
        notes: { type: String, maxlength: 500 },
        actorId: Schema.Types.ObjectId,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    statusHistory: [
      {
        from: String,
        to: String,
        reason: String,
        actorId: Schema.Types.ObjectId,
        actorKind: { type: String, enum: ["customer", "staff", "system"] },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    conflictOverrides: [
      {
        driverId: Schema.Types.ObjectId,
        conflictingRefs: [String],
        reason: { type: String, required: true },
        actorId: Schema.Types.ObjectId,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    cancellation: {
      requestedAt: Date,
      requestReason: String,
      reason: String,
      feeAmount: Number,
      refundAmount: Number,
      decidedBy: Schema.Types.ObjectId,
      decidedAt: Date,
    },
    version: { type: Number, default: 0 },
  },
  opts,
);
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, scheduledStart: 1 });
bookingSchema.index({ driverId: 1, scheduledStart: 1 });
export const BookingModel = model("Booking", bookingSchema);

// ---------- Payments (ledger) ----------
const paymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    method: { type: String, enum: ["upi", "card", "cash"], required: true },
    status: { type: String, enum: ["pending", "succeeded", "failed", "refunded", "partially_refunded"], default: "pending" },
    gatewayOrderId: { type: String, index: true, sparse: true },
    gatewayPaymentId: { type: String, index: true, sparse: true },
    /** Unique per webhook event: duplicate events are rejected, not re-applied. */
    gatewayEventIds: [String],
    receivedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    reference: { type: String, maxlength: 120 },
    recordedAt: { type: Date, default: Date.now },
  },
  opts,
);
export const PaymentModel = model("Payment", paymentSchema);

// ---------- Coupons ----------
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["first_hour_price"], required: true },
    /** For first_hour_price: the price charged for the first hour (₹99 launch offer). */
    value: { type: Number, required: true, min: 0 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    eligibleServices: [{ type: String }],
    minAmount: { type: Number, default: 0 },
    /**
     * Max redemptions per customer. 0 = unlimited, 1 = once per customer
     * (enforced by a unique index on redemptions). Values >1 unsupported.
     */
    perCustomerLimit: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  opts,
);
export const CouponModel = model("Coupon", couponSchema);

// ---------- Coupon redemptions (per-customer usage) ----------
const couponRedemptionSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    redeemedAt: { type: Date, default: Date.now },
  },
  opts,
);
// Once-per-customer enforcement: exactly one redemption row per (code, customer).
couponRedemptionSchema.index({ code: 1, customerId: 1 }, { unique: true });
couponRedemptionSchema.index({ customerId: 1, redeemedAt: -1 });
export const CouponRedemptionModel = model("CouponRedemption", couponRedemptionSchema);

// ---------- Settings (versioned; the active one is used) ----------
const settingsSchema = new Schema(
  {
    version: { type: Number, required: true, unique: true },
    active: { type: Boolean, default: false, index: true },
    pricing: Schema.Types.Mixed,
    policy: Schema.Types.Mixed,
    changedBy: Schema.Types.ObjectId,
    changeReason: String,
  },
  opts,
);
export const SettingsModel = model("Settings", settingsSchema);

// ---------- Support tickets ----------
export const TICKET_CATEGORIES = ["booking", "payment", "refund", "driver", "vehicle_pickup", "account", "other"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"] as const;
export const TICKET_CHANNELS = ["phone", "whatsapp", "web", "app", "other"] as const;
const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    description: { type: String, required: true, maxlength: 2000 },
    channel: { type: String, enum: TICKET_CHANNELS, required: true },
    status: { type: String, enum: TICKET_STATUSES, default: "open", index: true },
    customerName: String,
    customerPhone: { type: String, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "Staff" },
    resolutionNotes: String,
    resolvedAt: Date,
    createdBy: Schema.Types.ObjectId,
  },
  opts,
);
export const TicketModel = model("Ticket", ticketSchema);

// ---------- Audit log (append-only at application level) ----------
const auditSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId },
    actorKind: { type: String, enum: ["customer", "staff", "system"], required: true },
    actorRole: String,
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true, index: true },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    reason: String,
    requestId: String,
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);
// Application code never calls update/delete on this collection.
export const AuditLogModel = model("AuditLog", auditSchema);
