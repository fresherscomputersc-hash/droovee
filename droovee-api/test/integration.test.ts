/**
 * End-to-end tests against an in-memory MongoDB replica set (transactions need a replica set).
 * Run with: npm test
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "net";
import type { Server } from "http";

let server: Server;
let base = "";
let mms: { stop: () => Promise<boolean> } | undefined;
let mongoose: typeof import("mongoose");
let models: typeof import("../src/models");

type Json = Record<string, any>;

async function call(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; body: Json }> {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

async function registerCustomer(phone: string, name: string) {
  // OTP is off by default: password-only registration.
  const reg = await call("POST", "/api/v1/auth/customer/register", undefined, {
    name,
    phone,
    password: "Sup3r-secret-pass",
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  return reg.body.accessToken as string;
}

async function staffLogin(email: string) {
  const r = await call("POST", "/api/v1/auth/staff/login", undefined, { email, password: "Staff-password-123" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.accessToken as string;
}

/**
 * Staff write helper: reads the booking's current version and sends it as
 * expectedVersion (required — stale writes must 409, not overwrite).
 */
async function adminWrite(method: string, path: string, token: string, id: string, body: Json = {}) {
  const cur = await call("GET", `/api/v1/admin/bookings/${id}`, token);
  assert.equal(cur.status, 200, JSON.stringify(cur.body));
  return call(method, path, token, { ...body, expectedVersion: cur.body.version });
}

const SLOT_A = { start: "2030-06-01T10:00:00+05:30", end: "2030-06-01T12:00:00+05:30" };
const SLOT_B = { start: "2030-06-01T11:00:00+05:30", end: "2030-06-01T13:00:00+05:30" };
const SLOT_C = { start: "2030-06-02T09:00:00+05:30", end: "2030-06-02T10:00:00+05:30" };

function bookingBody(slot: { start: string; end: string }, extra: Json = {}) {
  return {
    serviceType: "hourly",
    immediate: false,
    pickup: { address: "Jayadev Vihar, Bhubaneswar" },
    scheduledStart: slot.start,
    durationHours: 2,
    carModel: "Maruti Swift",
    transmission: "manual",
    instructions: "Call on arrival",
    ...extra,
  };
}

before(async () => {
  process.env.NODE_ENV = "test";
  // Keep integration tests deterministic even when a local .env enables OTP.
  process.env.OTP_ENABLED = "false";
  process.env.OTP_RESEND_COOLDOWN_SECONDS = "0";
  process.env.TOKEN_PEPPER = "test-pepper";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";

  // CI/local default: throwaway in-memory replica set. On machines where the
  // memory-server binary starts too slowly, point at an external replica set:
  //   TEST_MONGODB_URI="mongodb://127.0.0.1:27017/droovee_test?replicaSet=rs0&directConnection=true"
  const externalUri = process.env.TEST_MONGODB_URI;
  // Dynamic import interop: prefer the default export (the mongoose instance).
  const mongooseNs: unknown = await import("mongoose");
  mongoose = ((mongooseNs as { default?: typeof import("mongoose") }).default ?? mongooseNs) as typeof import("mongoose");
  if (externalUri) {
    process.env.MONGODB_URI = externalUri;
  } else {
    const { MongoMemoryReplSet } = await import("mongodb-memory-server");
    const repl = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
      // mongod can take well over its 10s default to become ready on Windows.
      instanceOpts: [{ launchTimeout: 120000 }],
    });
    mms = repl;
    process.env.MONGODB_URI = repl.getUri("droovee_test");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  // Clean slate: the in-memory DB is fresh, but an external TEST_MONGODB_URI
  // persists between runs — drop it so seeds never collide.
  await mongoose.connection?.db?.dropDatabase();
  models = await import("../src/models");
  const bcrypt = (await import("bcryptjs")).default;
  const { createApp } = await import("../src/app");

  await models.StaffModel.create([
    { name: "Owner", email: "owner@droovee.test", role: "owner_super_admin", passwordHash: await bcrypt.hash("Staff-password-123", 4) },
    { name: "Ops", email: "ops@droovee.test", role: "operations", passwordHash: await bcrypt.hash("Staff-password-123", 4) },
    { name: "Finance", email: "fin@droovee.test", role: "finance", passwordHash: await bcrypt.hash("Staff-password-123", 4) },
  ]);
  await models.DriverModel.create([
    { employeeCode: "D-001", name: "Ramesh", phone: "+919000000001" },
    { employeeCode: "D-002", name: "Suresh", phone: "+919000000002" },
    { employeeCode: "D-003", name: "Mahesh", phone: "+919000000003" },
  ]);
  await models.CouponModel.create({
    code: "FIRSTHOUR99",
    type: "first_hour_price",
    value: 99,
    validFrom: new Date("2026-01-01"),
    validTo: new Date("2035-01-01"),
    eligibleServices: ["hourly"],
    perCustomerLimit: 1,
  });
  await models.CouponModel.create({
    code: "MIN500",
    type: "first_hour_price",
    value: 99,
    validFrom: new Date("2026-01-01"),
    validTo: new Date("2035-01-01"),
    eligibleServices: ["hourly"],
    minAmount: 500,
  });
  await models.BookingModel.syncIndexes();

  server = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mms?.stop();
});

test("estimate: coupon reprices the first hour to ₹99 and is labelled as an estimate", async () => {
  const r = await call("GET", `/api/v1/pricing/estimate?serviceType=hourly&durationHours=1&startAt=${encodeURIComponent(SLOT_A.start)}&couponCode=FIRSTHOUR99`);
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 99);
  assert.equal(r.body.isEstimate, true);
});

test("coupons: non-hourly service, below-minimum fare, and per-customer reuse are rejected", async () => {
  // first_hour_price never applies outside hourly — even when eligibleServices is open.
  const wrongService = await call(
    "GET",
    `/api/v1/pricing/estimate?serviceType=half_day&durationHours=4&startAt=${encodeURIComponent(SLOT_A.start)}&couponCode=FIRSTHOUR99`,
  );
  assert.equal(wrongService.status, 400);
  assert.equal(wrongService.body.fieldErrors?.couponCode, "ineligible");

  // 1 h hourly is ₹149 base — below MIN500's ₹500 minimum.
  const belowMin = await call(
    "GET",
    `/api/v1/pricing/estimate?serviceType=hourly&durationHours=1&startAt=${encodeURIComponent(SLOT_A.start)}&couponCode=MIN500`,
  );
  assert.equal(belowMin.status, 400);
  assert.equal(belowMin.body.fieldErrors?.couponCode, "below_minimum");

  // Once-per-customer: second booking with the same coupon fails.
  const token = await registerCustomer("9826666666", "Coupon Reuser");
  const first = await call("POST", "/api/v1/bookings", token, bookingBody(SLOT_A, { couponCode: "FIRSTHOUR99" }));
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const second = await call("POST", "/api/v1/bookings", token, bookingBody(SLOT_C, { couponCode: "FIRSTHOUR99" }));
  assert.equal(second.status, 400);
  assert.equal(second.body.fieldErrors?.couponCode, "already_used");
});

test("OTP endpoints are off while OTP sign-in is disabled", async () => {
  const status = await call("GET", "/api/v1/auth/otp/status");
  assert.equal(status.status, 200);
  assert.equal(status.body.enabled, false);
  const r = await call("POST", "/api/v1/auth/otp/request", undefined, { phone: "9811111111", purpose: "register" });
  assert.equal(r.status, 404);
  const l = await call("POST", "/api/v1/auth/customer/login-otp", undefined, { phone: "9811111111", otp: "123456" });
  assert.equal(l.status, 404);
});

test("booking: customer creates a booking with password-only login", async () => {
  // With OTP off, a password-registered customer can book straight away.
  const bcryptMod = (await import("bcryptjs")).default;
  await models.CustomerModel.create({ name: "PwOnly", phone: "+919811100000", phoneVerified: false, passwordHash: await bcryptMod.hash("Sup3r-secret-pass", 4) });
  const login = await call("POST", "/api/v1/auth/customer/login", undefined, { phone: "9811100000", password: "Sup3r-secret-pass" });
  assert.equal(login.status, 200);
  const ok = await call("POST", "/api/v1/bookings", login.body.accessToken, bookingBody(SLOT_A));
  assert.equal(ok.status, 201, JSON.stringify(ok.body));

  const token = await registerCustomer("9822222222", "Asha Rao");
  const created = await call("POST", "/api/v1/bookings", token, bookingBody(SLOT_A, { couponCode: "FIRSTHOUR99" }));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.match(created.body.bookingNumber, /^DRV-[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(created.body.status, "requested");
  // 2 h hourly: ₹99 first-hour coupon + ₹129 extra hour = ₹228
  assert.equal(created.body.estimate.total, 228);
});

test("alarm: customer bookings appear after the cursor; staff bookings are marked staff", async () => {
  const owner = await staffLogin("owner@droovee.test");
  // First poll is a baseline only: existing bookings must not alarm.
  const baseline = await call("GET", "/api/v1/admin/notifications/new-bookings", owner);
  assert.equal(baseline.status, 200);
  assert.equal(baseline.body.items.length, 0);
  const cursor = baseline.body.cursor as string;

  const customer = await registerCustomer("9812300003", "Alarm Customer");
  const customerBooking = await call("POST", "/api/v1/bookings", customer, bookingBody(SLOT_C));
  assert.equal(customerBooking.status, 201, JSON.stringify(customerBooking.body));

  const staffMade = await call("POST", "/api/v1/admin/bookings", owner, {
    name: "Staff Made",
    phone: "9812300004",
    serviceType: "hourly",
    pickupAddress: "Jayadev Vihar, Bhubaneswar",
    scheduledStart: "2030-08-01T10:00:00+05:30",
    durationHours: 2,
    carModel: "Maruti Swift",
    transmission: "manual",
    source: "call",
  });
  assert.equal(staffMade.status, 201, JSON.stringify(staffMade.body));

  const poll = await call("GET", `/api/v1/admin/notifications/new-bookings?after=${encodeURIComponent(cursor)}`, owner);
  assert.equal(poll.status, 200);
  const items = poll.body.items as Json[];
  assert.equal(items.find((b) => b.id === customerBooking.body.id)?.origin, "customer");
  assert.equal(items.find((b) => b.id === staffMade.body.id)?.origin, "staff");
  assert.equal(poll.body.cursor, staffMade.body.id);
});

test("customers only see their own bookings (404 for others)", async () => {
  const a = await registerCustomer("9833333333", "Customer A");
  const b = await registerCustomer("9844444444", "Customer B");
  const made = await call("POST", "/api/v1/bookings", a, bookingBody(SLOT_C));
  assert.equal(made.status, 201);
  const other = await call("GET", `/api/v1/bookings/${made.body.id}`, b);
  assert.equal(other.status, 404);
  const mine = await call("GET", `/api/v1/bookings/${made.body.id}`, a);
  assert.equal(mine.status, 200);
});

test("assignment workflow: confirm → assign → conflict warning → override → contact → on-the-way", async () => {
  const customer = await registerCustomer("9855555555", "Workflow Customer");
  const ops = await staffLogin("ops@droovee.test");
  const drivers = await models.DriverModel.find({ employeeCode: { $in: ["D-001"] } }).lean();
  const d1 = String(drivers[0]._id);

  const b1 = (await call("POST", "/api/v1/bookings", customer, bookingBody(SLOT_A))).body;
  const b2 = (await call("POST", "/api/v1/bookings", customer, bookingBody(SLOT_B))).body;

  // Cannot assign before confirmation.
  const early = await adminWrite("PATCH", `/api/v1/admin/bookings/${b1.id}/assign`, ops, b1.id, { driverId: d1 });
  assert.equal(early.status, 409);

  assert.equal((await adminWrite("PATCH", `/api/v1/admin/bookings/${b1.id}/status`, ops, b1.id, { to: "confirmed" })).status, 200);
  assert.equal((await adminWrite("PATCH", `/api/v1/admin/bookings/${b2.id}/status`, ops, b2.id, { to: "confirmed" })).status, 200);

  const first = await adminWrite("PATCH", `/api/v1/admin/bookings/${b1.id}/assign`, ops, b1.id, { driverId: d1 });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.status, "driver_assigned");

  // Overlapping booking: system warns and does not assign without a reason.
  const warn = await adminWrite("PATCH", `/api/v1/admin/bookings/${b2.id}/assign`, ops, b2.id, { driverId: d1 });
  assert.equal(warn.status, 409);
  assert.equal(warn.body.details?.code, "DRIVER_CONFLICT_WARNING");
  assert.equal(warn.body.details.conflicts.length, 1);

  // Override with reason (operations has conflict:override).
  const forced = await adminWrite("PATCH", `/api/v1/admin/bookings/${b2.id}/assign`, ops, b2.id, {
    driverId: d1,
    overrideReason: "Customer agreed to a 15 min later start",
  });
  assert.equal(forced.status, 200, JSON.stringify(forced.body));
  assert.equal(forced.body.warnings.length, 1);

  const detail = await call("GET", `/api/v1/admin/bookings/${b2.id}`, ops);
  assert.equal(detail.body.conflictOverrides.length, 1);

  // Cannot go on the way until the driver confirmed.
  const noConfirm = await adminWrite("PATCH", `/api/v1/admin/bookings/${b1.id}/status`, ops, b1.id, { to: "driver_on_the_way" });
  assert.equal(noConfirm.status, 409);
  assert.ok(noConfirm.body.fieldErrors?.to);

  const contact = await adminWrite("POST", `/api/v1/admin/bookings/${b1.id}/contact-log`, ops, b1.id, { channel: "whatsapp", result: "confirmed", notes: "OK" });
  assert.equal(contact.status, 201);
  assert.equal((await adminWrite("PATCH", `/api/v1/admin/bookings/${b1.id}/status`, ops, b1.id, { to: "driver_on_the_way" })).status, 200);

  // Illegal transition rejected.
  const illegal = await adminWrite("PATCH", `/api/v1/admin/bookings/${b1.id}/status`, ops, b1.id, { to: "completed" });
  assert.equal(illegal.status, 409);

  // Customer sees driver details only after assignment; internal fields are hidden.
  const view = await call("GET", `/api/v1/bookings/${b1.id}`, customer);
  assert.equal(view.body.driver.name, "Ramesh");
  assert.equal(view.body.conflictOverrides, undefined);
  assert.equal(view.body.contactLog, undefined);
});

test("role enforcement: finance cannot assign; operations cannot change fares", async () => {
  const customer = await registerCustomer("9866666666", "Role Customer");
  const fin = await staffLogin("fin@droovee.test");
  const ops = await staffLogin("ops@droovee.test");
  const b = (await call("POST", "/api/v1/bookings", customer, bookingBody(SLOT_C))).body;
  await adminWrite("PATCH", `/api/v1/admin/bookings/${b.id}/status`, ops, b.id, { to: "confirmed" });

  const denied = await call("PATCH", `/api/v1/admin/bookings/${b.id}/assign`, fin, { driverId: String((await models.DriverModel.findOne({ employeeCode: "D-002" }))!._id) });
  assert.equal(denied.status, 403);

  const fare = await call("PATCH", `/api/v1/admin/bookings/${b.id}/fare`, ops, { finalFare: 1, reason: "try to cheat" });
  assert.equal(fare.status, 403);

  const pay = await call("POST", `/api/v1/admin/bookings/${b.id}/offline-payment`, fin, { amount: 149, method: "cash", reference: "R-1" });
  assert.equal(pay.status, 201);
});

test("concurrency: two simultaneous assignments of one driver → exactly one succeeds", async () => {
  const customer = await registerCustomer("9877777777", "Race Customer");
  const ops = await staffLogin("ops@droovee.test");
  const driver = await models.DriverModel.findOne({ employeeCode: "D-003" });
  const slotX = { start: "2030-07-01T10:00:00+05:30", end: "2030-07-01T12:00:00+05:30" };
  const slotY = { start: "2030-07-01T11:00:00+05:30", end: "2030-07-01T13:00:00+05:30" };
  const x = (await call("POST", "/api/v1/bookings", customer, bookingBody(slotX))).body;
  const y = (await call("POST", "/api/v1/bookings", customer, bookingBody(slotY))).body;
  for (const id of [x.id, y.id]) {
    const cur = await call("GET", `/api/v1/admin/bookings/${id}`, ops);
    assert.equal(cur.status, 200);
    assert.equal((await call("PATCH", `/api/v1/admin/bookings/${id}/status`, ops, { to: "confirmed", expectedVersion: cur.body.version })).status, 200);
  }

  // No override reason: the second assignment must be warned about once the first has committed.
  // Both carry the version they read — the loser fails on the driver clash, not a stale write.
  const vx = (await call("GET", `/api/v1/admin/bookings/${x.id}`, ops)).body.version;
  const vy = (await call("GET", `/api/v1/admin/bookings/${y.id}`, ops)).body.version;
  const [r1, r2] = await Promise.all([
    call("PATCH", `/api/v1/admin/bookings/${x.id}/assign`, ops, { driverId: String(driver!._id), expectedVersion: vx }),
    call("PATCH", `/api/v1/admin/bookings/${y.id}/assign`, ops, { driverId: String(driver!._id), expectedVersion: vy }),
  ]);
  const statuses = [r1.status, r2.status].sort();
  assert.deepEqual(statuses, [200, 409], JSON.stringify([r1.body, r2.body]));
  const loser = r1.status === 409 ? r1 : r2;
  assert.equal(loser.body.details?.code, "DRIVER_CONFLICT_WARNING");
});

test("stale expectedVersion is rejected; demote to confirmed unassigns the driver", async () => {
  const customer = await registerCustomer("9888888888", "Version Customer");
  const ops = await staffLogin("ops@droovee.test");
  const driverId = String((await models.DriverModel.findOne({ employeeCode: "D-001" }))!._id);
  const made = (await call("POST", "/api/v1/bookings", customer, bookingBody(SLOT_C))).body;
  await adminWrite("PATCH", `/api/v1/admin/bookings/${made.id}/status`, ops, made.id, { to: "confirmed" });
  await adminWrite("PATCH", `/api/v1/admin/bookings/${made.id}/assign`, ops, made.id, { driverId });

  // Stale write: version 0 is long gone.
  const stale = await call("PATCH", `/api/v1/admin/bookings/${made.id}/status`, ops, { to: "driver_on_the_way", expectedVersion: 0 });
  assert.equal(stale.status, 409);

  // Missing version is a validation error, not a silent overwrite.
  const missing = await call("PATCH", `/api/v1/admin/bookings/${made.id}/status`, ops, { to: "driver_on_the_way" });
  assert.equal(missing.status, 400);

  // Demote back to confirmed: the driver is detached.
  const cur = await call("GET", `/api/v1/admin/bookings/${made.id}`, ops);
  const demote = await call("PATCH", `/api/v1/admin/bookings/${made.id}/status`, ops, { to: "confirmed", expectedVersion: cur.body.version });
  assert.equal(demote.status, 200);
  const after = await call("GET", `/api/v1/admin/bookings/${made.id}`, ops);
  assert.equal(after.body.status, "confirmed");
  assert.equal(after.body.driverId, null);
});

test("cancellation can be re-requested with a corrected reason", async () => {
  const customer = await registerCustomer("9899999999", "Cancel Customer");
  const made = (await call("POST", "/api/v1/bookings", customer, bookingBody(SLOT_C))).body;
  assert.equal((await call("POST", `/api/v1/bookings/${made.id}/cancel`, customer, { reason: "plans changed" })).status, 202);
  assert.equal((await call("POST", `/api/v1/bookings/${made.id}/cancel`, customer, { reason: "plans changed again" })).status, 202);
  const owner = await staffLogin("owner@droovee.test");
  const detail = await call("GET", `/api/v1/admin/bookings/${made.id}`, owner);
  assert.equal(detail.body.cancellation.requestReason, "plans changed again");
});

test("forgot/reset password issues a one-time link and invalidates the old password", async () => {
  const email = "reset-flow@droovee.test";
  const oldPassword = "Sup3r-secret-pass";
  const newPassword = "N3w-secret-pass!";
  const reg = await call("POST", "/api/v1/auth/customer/register", undefined, {
    name: "Reset Flow",
    phone: "9812300002",
    email,
    password: oldPassword,
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));

  const forgot = await call("POST", "/api/v1/auth/customer/forgot-password", undefined, { email });
  assert.equal(forgot.status, 200, JSON.stringify(forgot.body));
  assert.ok(forgot.body.debugLink, JSON.stringify(forgot.body));
  const token = new URL(forgot.body.debugLink as string).searchParams.get("token");
  assert.ok(token);

  const reset = await call("POST", "/api/v1/auth/customer/reset-password", undefined, { token, password: newPassword });
  assert.equal(reset.status, 200, JSON.stringify(reset.body));

  const oldLogin = await call("POST", "/api/v1/auth/customer/login", undefined, { phone: "9812300002", password: oldPassword });
  assert.equal(oldLogin.status, 401);
  const newLogin = await call("POST", "/api/v1/auth/customer/login", undefined, { phone: "9812300002", password: newPassword });
  assert.equal(newLogin.status, 200, JSON.stringify(newLogin.body));
});

test("guest can request cancellation from tracking with booking ID + mobile", async () => {
  const phone = "9812300001";
  const made = await call("POST", "/api/v1/bookings/guest", undefined, {
    name: "Guest Canceller",
    phone,
    serviceType: "hourly",
    immediate: false,
    pickup: { address: "Jayadev Vihar, Bhubaneswar" },
    scheduledStart: SLOT_C.start,
    durationHours: 2,
    carModel: "Maruti Swift",
    transmission: "manual",
    instructions: "Call on arrival",
    paymentPreference: "cash_upi",
    agreedToTerms: true,
  });
  assert.equal(made.status, 201, JSON.stringify(made.body));

  // Wrong mobile must not reveal or modify the booking.
  const wrong = await call("POST", "/api/v1/bookings/track/cancel", undefined, {
    bookingNumber: made.body.bookingNumber,
    phone: "9812300099",
    reason: "plans changed",
  });
  assert.equal(wrong.status, 404);

  const cancelled = await call("POST", "/api/v1/bookings/track/cancel", undefined, {
    bookingNumber: made.body.bookingNumber,
    phone,
    reason: "plans changed",
  });
  assert.equal(cancelled.status, 202, JSON.stringify(cancelled.body));

  const tracked = await call(
    "GET",
    `/api/v1/bookings/track?bookingNumber=${encodeURIComponent(made.body.bookingNumber)}&phone=${phone}`,
  );
  assert.equal(tracked.status, 200, JSON.stringify(tracked.body));
  assert.equal(tracked.body.cancellationRequested, true);
  assert.equal(tracked.body.cancellationPending, true);
  assert.equal(tracked.body.cancelRequestReason, "plans changed");
});

test("weak passwords are rejected on register and staff create", async () => {
  const weak = await call("POST", "/api/v1/auth/customer/register", undefined, { name: "Weak", phone: "9812345670", password: "password1" });
  assert.equal(weak.status, 400);
  assert.ok(weak.body.fieldErrors?.password, JSON.stringify(weak.body));
  const owner = await staffLogin("owner@droovee.test");
  const staff = await call("POST", "/api/v1/admin/staff", owner, { name: "Weak Staff", email: "weak@droovee.test", password: "password123", role: "support" });
  assert.equal(staff.status, 400);
  assert.ok(staff.body.fieldErrors?.password, JSON.stringify(staff.body));
});

test("refresh reuse kills the session family", async () => {
  // Shrink the double-submit grace so the theft path is deterministic.
  process.env.REFRESH_REUSE_GRACE_MS = "1";
  try {
    const login = await call("POST", "/api/v1/auth/staff/login", undefined, { email: "ops@droovee.test", password: "Staff-password-123" });
    assert.equal(login.status, 200);
    const r1 = login.body.refreshToken as string;
    const ref = await call("POST", "/api/v1/auth/refresh", undefined, { refreshToken: r1 });
    assert.equal(ref.status, 200, JSON.stringify(ref.body));
    // Reuse the dead token: thief or replay — the family dies.
    assert.equal((await call("POST", "/api/v1/auth/refresh", undefined, { refreshToken: r1 })).status, 401);
    // The rotated token from the same family is dead too.
    assert.equal((await call("POST", "/api/v1/auth/refresh", undefined, { refreshToken: ref.body.refreshToken })).status, 401);
  } finally {
    delete process.env.REFRESH_REUSE_GRACE_MS;
  }
});

test("disabled staff lose access on the next request", async () => {
  const owner = await staffLogin("owner@droovee.test");
  const login = await call("POST", "/api/v1/auth/staff/login", undefined, { email: "ops@droovee.test", password: "Staff-password-123" });
  assert.equal(login.status, 200);
  const ops = login.body.accessToken as string;
  const opsRefresh = login.body.refreshToken as string;
  const opsDoc = await models.StaffModel.findOne({ email: "ops@droovee.test" });
  assert.equal((await call("GET", "/api/v1/admin/bookings", ops)).status, 200);
  const off = await call("PATCH", `/api/v1/admin/staff/${opsDoc!._id}`, owner, { active: false });
  assert.equal(off.status, 200);
  assert.equal((await call("GET", "/api/v1/admin/bookings", ops)).status, 401);
  // The refresh chain is dead too — no silent re-entry after disable.
  assert.equal((await call("POST", "/api/v1/auth/refresh", undefined, { refreshToken: opsRefresh })).status, 401);
});

test("audit log records assignment, override and status change", async () => {
  const owner = await staffLogin("owner@droovee.test");
  const logs = await call("GET", "/api/v1/admin/audit-logs", owner);
  assert.equal(logs.status, 200);
  const actions = logs.body.items.map((i: Json) => i.action);
  assert.ok(actions.includes("booking.assign"));
  assert.ok(actions.includes("booking.status_change"));
  assert.ok(actions.includes("booking.contact_log"));
});
