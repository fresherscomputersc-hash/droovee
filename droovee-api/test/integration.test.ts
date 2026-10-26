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

/** Logs in through the driver portal and returns the httpOnly session cookie. */
async function driverLogin(identifier: string, pin: string): Promise<string> {
  const res = await fetch(base + "/api/v1/driver/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, pin }),
  });
  const text = await res.text();
  assert.equal(res.status, 200, text);
  const setCookie = res.headers.get("set-cookie");
  assert.ok(setCookie, "driver login must set a session cookie");
  return setCookie.split(";")[0];
}

async function driverCall(method: string, path: string, cookie: string, body?: unknown): Promise<{ status: number; body: Json }> {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
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
  const token = await registerCustomer("9826000001", "Pricing Viewer");
  const r = await call(
    "GET",
    `/api/v1/pricing/estimate?serviceType=hourly&durationHours=1&startAt=${encodeURIComponent(SLOT_A.start)}&couponCode=FIRSTHOUR99`,
    token,
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 99);
  assert.equal(r.body.isEstimate, true);
});

test("coupons: non-hourly service, below-minimum fare, and per-customer reuse are rejected", async () => {
  const token = await registerCustomer("9826000002", "Coupon Viewer");
  // first_hour_price never applies outside hourly — even when eligibleServices is open.
  const wrongService = await call(
    "GET",
    `/api/v1/pricing/estimate?serviceType=half_day&durationHours=4&startAt=${encodeURIComponent(SLOT_A.start)}&couponCode=FIRSTHOUR99`,
    token,
  );
  assert.equal(wrongService.status, 400);
  assert.equal(wrongService.body.fieldErrors?.couponCode, "ineligible");

  // 1 h hourly is ₹149 base — below MIN500's ₹500 minimum.
  const belowMin = await call(
    "GET",
    `/api/v1/pricing/estimate?serviceType=hourly&durationHours=1&startAt=${encodeURIComponent(SLOT_A.start)}&couponCode=MIN500`,
    token,
  );
  assert.equal(belowMin.status, 400);
  assert.equal(belowMin.body.fieldErrors?.couponCode, "below_minimum");

  // Once-per-customer: second booking with the same coupon fails.
  const reuserToken = await registerCustomer("9826666666", "Coupon Reuser");
  const first = await call("POST", "/api/v1/bookings", reuserToken, bookingBody(SLOT_A, { couponCode: "FIRSTHOUR99" }));
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const second = await call("POST", "/api/v1/bookings", reuserToken, bookingBody(SLOT_C, { couponCode: "FIRSTHOUR99" }));
  assert.equal(second.status, 400);
  assert.equal(second.body.fieldErrors?.couponCode, "already_used");
});

test("pricing catalogue and estimates require authentication", async () => {
  const estimatePath = `/api/v1/pricing/estimate?serviceType=hourly&durationHours=2&startAt=${encodeURIComponent(SLOT_A.start)}`;
  const anonymousEstimate = await call("GET", estimatePath);
  assert.equal(anonymousEstimate.status, 401);
  const anonymousServices = await call("GET", "/api/v1/services");
  assert.equal(anonymousServices.status, 401);

  const token = await registerCustomer("9826000003", "Pricing Viewer 2");
  const services = await call("GET", "/api/v1/services", token);
  assert.equal(services.status, 200);
  assert.equal(services.body.services.length, 7);
  assert.equal(typeof services.body.fees?.lateNightSurcharge, "number");
  const estimate = await call("GET", estimatePath, token);
  assert.equal(estimate.status, 200);
  assert.equal(estimate.body.total, 278);
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

test("guest booking endpoint is removed", async () => {
  const r = await call("POST", "/api/v1/bookings/guest", undefined, {
    serviceType: "hourly",
    pickup: { address: "Jayadev Vihar, Bhubaneswar" },
    scheduledStart: SLOT_A.start,
    durationHours: 2,
    carModel: "Maruti Swift",
    transmission: "manual",
  });
  assert.equal(r.status, 404);
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

test("customer can request cancellation from tracking with booking ID + mobile", async () => {
  const phone = "9812300001";
  const token = await registerCustomer(phone, "Track Canceller");
  const made = await call("POST", "/api/v1/bookings", token, bookingBody(SLOT_C, { instructions: "Call on arrival" }));
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

test("dispatch queue filters by assignment, service and free text", async () => {
  const token = await registerCustomer("9812300101", "Dispatch Tester");
  const made = await call(
    "POST",
    "/api/v1/bookings",
    token,
    bookingBody({ start: "2031-03-01T10:00:00+05:30", end: "2031-03-01T12:00:00+05:30" }),
  );
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const number = made.body.bookingNumber as string;

  const owner = await staffLogin("owner@droovee.test");
  const all = await call("GET", "/api/v1/admin/bookings?limit=200", owner);
  assert.equal(all.status, 200);
  assert.ok(all.body.items.some((b: Json) => b.driverId), "default list must include assigned bookings");
  assert.ok(all.body.items.some((b: Json) => !b.driverId), "default list must include unassigned bookings");

  const found = await call("GET", `/api/v1/admin/bookings?q=${encodeURIComponent(number)}`, owner);
  assert.equal(found.status, 200, JSON.stringify(found.body));
  assert.ok(found.body.items.some((b: Json) => b.bookingNumber === number));

  const byCustomer = await call("GET", `/api/v1/admin/bookings?q=${encodeURIComponent("Dispatch Tester")}`, owner);
  assert.equal(byCustomer.status, 200);
  assert.ok(byCustomer.body.items.some((b: Json) => b.customer?.name === "Dispatch Tester"));

  const hourly = await call("GET", "/api/v1/admin/bookings?serviceType=hourly&limit=200", owner);
  assert.equal(hourly.status, 200);
  assert.ok(hourly.body.items.length > 0);
  assert.ok(hourly.body.items.every((b: Json) => b.serviceType === "hourly"));

  const unassigned = await call("GET", "/api/v1/admin/bookings?assigned=false&limit=200", owner);
  assert.equal(unassigned.status, 200);
  assert.ok(unassigned.body.items.length > 0);
  assert.ok(unassigned.body.items.every((b: Json) => !b.driverId && !b.driver));

  const assigned = await call("GET", "/api/v1/admin/bookings?assigned=true&limit=200", owner);
  assert.equal(assigned.status, 200);
  assert.ok(assigned.body.items.length > 0);
  assert.ok(assigned.body.items.every((b: Json) => b.driverId && b.driver?.employeeCode));
});

test("bulk portal PIN onboarding issues one PIN per active driver, once", async () => {
  const owner = await staffLogin("owner@droovee.test");
  const first = await call("POST", "/api/v1/admin/drivers/bulk-portal-pin", owner, {});
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(first.body.count, 3);
  assert.equal(first.body.items.length, 3);
  for (const item of first.body.items) {
    assert.match(item.pin, /^\d{6}$/);
    assert.ok(item.employeeCode);
    assert.ok(item.name);
  }

  const again = await call("POST", "/api/v1/admin/drivers/bulk-portal-pin", owner, {});
  assert.equal(again.status, 400, JSON.stringify(again.body));

  const drivers = await call("GET", "/api/v1/admin/drivers", owner);
  assert.equal(drivers.status, 200);
  assert.ok(drivers.body.items.every((d: Json) => d.employmentStatus !== "active" || d.portalPinSetAt));
  assert.ok(drivers.body.items.every((d: Json) => !("portalPinHash" in d)));

  const audit = await call("GET", "/api/v1/admin/audit-logs?action=driver.bulk_portal_pin", owner);
  assert.equal(audit.status, 200);
  assert.ok(audit.body.items.some((a: Json) => a.after?.count === 3));
});

test("availability block can be removed and the removal is audited", async () => {
  const owner = await staffLogin("owner@droovee.test");
  const drivers = await call("GET", "/api/v1/admin/drivers", owner);
  const driverId = drivers.body.items[0]._id as string;

  const created = await call("POST", "/api/v1/admin/availability-blocks", owner, {
    driverId,
    startAt: "2031-04-01T00:00:00+05:30",
    endAt: "2031-04-02T00:00:00+05:30",
    type: "leave",
    reason: "Family function",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const blockId = created.body.block._id as string;

  const removed = await call("DELETE", `/api/v1/admin/availability-blocks/${blockId}`, owner);
  assert.equal(removed.status, 200, JSON.stringify(removed.body));

  const list = await call("GET", `/api/v1/admin/availability-blocks?driverId=${driverId}`, owner);
  assert.equal(list.status, 200);
  assert.ok(!list.body.items.some((b: Json) => b._id === blockId));

  const audit = await call("GET", "/api/v1/admin/audit-logs?action=availability.block_delete", owner);
  assert.equal(audit.status, 200);
  assert.ok(audit.body.items.some((a: Json) => a.entityId === blockId));
});

test("driver portal: own trips only, leave lifecycle, and expired-session rejection", async () => {
  const bcrypt = (await import("bcryptjs")).default;
  const pin = "246810";
  const hash = await bcrypt.hash(pin, 4);
  const d1 = await models.DriverModel.findOneAndUpdate(
    { employeeCode: "D-001" },
    { $set: { portalPinHash: hash, portalPinSetAt: new Date() } },
    { returnDocument: "after" },
  ).lean();
  const d3 = await models.DriverModel.findOneAndUpdate(
    { employeeCode: "D-003" },
    { $set: { portalPinHash: hash, portalPinSetAt: new Date() } },
    { returnDocument: "after" },
  ).lean();
  assert.ok(d1 && d3);

  const c1 = await driverLogin("D-001", pin);
  const c3 = await driverLogin("D-003", pin);

  const j1 = await driverCall("GET", "/api/v1/driver/portal/jobs", c1);
  const j3 = await driverCall("GET", "/api/v1/driver/portal/jobs", c3);
  assert.equal(j1.status, 200, JSON.stringify(j1.body));
  assert.equal(j3.status, 200, JSON.stringify(j3.body));
  assert.ok(j1.body.items.length > 0, "D-001 should have assigned trips");
  assert.ok(j3.body.items.length > 0, "D-003 should have the concurrency-test trip");

  const ids1 = new Set(j1.body.items.map((j: Json) => j.id));
  const ids3 = new Set(j3.body.items.map((j: Json) => j.id));
  assert.ok([...ids1].every((id) => !ids3.has(id)), "drivers must not see each other's trips");
  for (const id of ids1) {
    const b = await models.BookingModel.findById(id).lean();
    assert.equal(String(b?.driverId), String(d1._id));
  }
  for (const id of ids3) {
    const b = await models.BookingModel.findById(id).lean();
    assert.equal(String(b?.driverId), String(d3._id));
  }

  // A driver cannot act on another driver's booking.
  const cross = await driverCall("POST", `/api/v1/driver/portal/jobs/${[...ids1][0]}/action`, c3, { action: "confirm" });
  assert.equal(cross.status, 404, JSON.stringify(cross.body));

  // No session -> 401.
  assert.equal((await call("GET", "/api/v1/driver/portal/jobs")).status, 401);

  // Expired token -> 401 (the web redirects to /driver/login?expired=1 on this).
  const { signAccess } = await import("../src/lib/tokens");
  const expired = signAccess({ sub: String(d1._id), kind: "driver", v: d1.tokenVersion ?? 0 }, -1);
  assert.equal((await call("GET", "/api/v1/driver/portal/jobs", expired)).status, 401);

  // Leave request lifecycle: create -> pending -> admin approve -> driver sees approved.
  const owner = await staffLogin("owner@droovee.test");
  const leaveId = await (async () => {
    const created = await driverCall("POST", "/api/v1/driver/portal/leave", c1, {
      type: "leave",
      startAt: "2031-06-01T00:00:00+05:30",
      endAt: "2031-06-02T00:00:00+05:30",
      reason: "Family function",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.block.status, "pending");
    assert.equal(created.body.block.requestedByKind, "driver");
    return created.body.block.id as string;
  })();

  // Overlap is rejected.
  const overlap = await driverCall("POST", "/api/v1/driver/portal/leave", c1, {
    type: "unavailable",
    startAt: "2031-06-01T12:00:00+05:30",
    endAt: "2031-06-03T00:00:00+05:30",
    reason: "Overlapping request",
  });
  assert.equal(overlap.status, 409, JSON.stringify(overlap.body));

  // Driver sees own pending request; another driver does not.
  const mine = await driverCall("GET", "/api/v1/driver/portal/leave", c1);
  assert.equal(mine.status, 200);
  assert.ok(mine.body.items.some((r: Json) => r.id === leaveId && r.status === "pending"));
  const theirs = await driverCall("GET", "/api/v1/driver/portal/leave", c3);
  assert.equal(theirs.status, 200);
  assert.ok(!theirs.body.items.some((r: Json) => r.id === leaveId));

  // Admin pending queue includes it, then approve.
  const pending = await call("GET", "/api/v1/admin/availability-blocks?status=pending", owner);
  assert.equal(pending.status, 200, JSON.stringify(pending.body));
  assert.ok(pending.body.items.some((b: Json) => b._id === leaveId && b.driver?.employeeCode === "D-001"));

  const approved = await call("PATCH", `/api/v1/admin/availability-blocks/${leaveId}/decision`, owner, { decision: "approve" });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.block.status, "approved");

  // Approved requests cannot be cancelled by the driver.
  const cancelApproved = await driverCall("DELETE", `/api/v1/driver/portal/leave/${leaveId}`, c1);
  assert.equal(cancelApproved.status, 409, JSON.stringify(cancelApproved.body));

  // A second pending request can be cancelled.
  const second = await driverCall("POST", "/api/v1/driver/portal/leave", c1, {
    type: "shift_off",
    startAt: "2031-06-10T00:00:00+05:30",
    endAt: "2031-06-11T00:00:00+05:30",
    reason: "Personal work",
  });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  const secondId = second.body.block.id as string;
  const cancelled = await driverCall("DELETE", `/api/v1/driver/portal/leave/${secondId}`, c1);
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal(cancelled.body.block.status, "cancelled");

  // A third request exercises rejection (note is mandatory) and the rejected state.
  const third = await driverCall("POST", "/api/v1/driver/portal/leave", c1, {
    type: "leave",
    startAt: "2031-06-20T00:00:00+05:30",
    endAt: "2031-06-21T00:00:00+05:30",
    reason: "Wedding in family",
  });
  assert.equal(third.status, 201, JSON.stringify(third.body));
  const thirdId = third.body.block.id as string;
  const rejectNoNote = await call("PATCH", `/api/v1/admin/availability-blocks/${thirdId}/decision`, owner, { decision: "reject" });
  assert.equal(rejectNoNote.status, 400, JSON.stringify(rejectNoNote.body));
  const rejected = await call("PATCH", `/api/v1/admin/availability-blocks/${thirdId}/decision`, owner, {
    decision: "reject",
    note: "Peak-season coverage is already committed.",
  });
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(rejected.body.block.status, "rejected");
  assert.equal(rejected.body.block.decisionNote, "Peak-season coverage is already committed.");
  const rejectedView = await driverCall("GET", "/api/v1/driver/portal/leave", c1);
  assert.ok(rejectedView.body.items.some((r: Json) => r.id === thirdId && r.status === "rejected"));

  // Decisions and cancellations are audited.
  const createdAudit = await call("GET", "/api/v1/admin/audit-logs?action=availability.request_create", owner);
  assert.equal(createdAudit.status, 200);
  assert.ok(createdAudit.body.items.some((a: Json) => a.entityId === leaveId));
  const decidedAudit = await call("GET", "/api/v1/admin/audit-logs?action=availability.request_decide", owner);
  assert.equal(decidedAudit.status, 200);
  assert.ok(decidedAudit.body.items.some((a: Json) => a.entityId === leaveId));
  const cancelAudit = await call("GET", "/api/v1/admin/audit-logs?action=availability.request_cancel", owner);
  assert.equal(cancelAudit.status, 200);
  assert.ok(cancelAudit.body.items.some((a: Json) => a.entityId === secondId));
});
