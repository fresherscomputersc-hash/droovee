import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefaultSettings, listUnconfirmed } from "../src/domain/settings";
import { estimateFare } from "../src/domain/pricing";
import { canTransition, isTerminal } from "../src/domain/status";
import { intervalsOverlap, findConflicts, bookingEnd } from "../src/domain/availability";

const S = getDefaultSettings();
// 2026-10-10 10:00 IST = 04:30 UTC
const DAY = new Date("2026-10-10T04:30:00Z");
// 2026-10-10 23:30 IST = 18:00 UTC
const NIGHT = new Date("2026-10-10T18:00:00Z");

test("hourly poster price is ₹149 for 1 hour", () => {
  const e = estimateFare({ serviceType: "hourly", durationHours: 1, startAt: DAY }, S);
  assert.equal(e.total, 149);
  assert.equal(e.isEstimate, true);
});

test("hourly with ₹99 first-hour coupon", () => {
  const e = estimateFare({ serviceType: "hourly", durationHours: 1, startAt: DAY, firstHourCouponPrice: 99 }, S);
  assert.equal(e.total, 99);
});

test("half-day ₹379 for 4 hours, extra hour at ₹89", () => {
  assert.equal(estimateFare({ serviceType: "half_day", durationHours: 4, startAt: DAY }, S).total, 379);
  assert.equal(estimateFare({ serviceType: "half_day", durationHours: 5, startAt: DAY }, S).total, 379 + 89);
});

test("full-day ₹849 for 8 hours", () => {
  assert.equal(estimateFare({ serviceType: "full_day", durationHours: 8, startAt: DAY }, S).total, 849);
});

test("late-night surcharge applies in 10 PM–6 AM IST window", () => {
  const e = estimateFare({ serviceType: "hourly", durationHours: 1, startAt: NIGHT }, S);
  assert.equal(e.total, 149 + 99);
  assert.ok(e.lines.some((l) => l.label.includes("Late-night")));
});

test("monthly office pickup is flat ₹5,999", () => {
  assert.equal(estimateFare({ serviceType: "monthly_office", durationHours: 1, startAt: DAY }, S).total, 5999);
});

test("airport pickup ₹159/hour", () => {
  assert.equal(estimateFare({ serviceType: "airport_pickup_drop", durationHours: 2, startAt: DAY }, S).total, 318);
});

test("outstation one-way ₹199/h and round-trip ₹169/h plus night halt ₹399", () => {
  assert.equal(estimateFare({ serviceType: "outstation_one_way", durationHours: 3, startAt: DAY }, S).total, 597);
  assert.equal(estimateFare({ serviceType: "outstation_round_trip", durationHours: 3, startAt: DAY, nights: 2 }, S).total, 3 * 169 + 2 * 399);
});

test("estimate is not flagged once pricing rules are confirmed", () => {
  const e = estimateFare({ serviceType: "hourly", durationHours: 1, startAt: DAY }, S);
  assert.equal(e.usesUnconfirmedRules, false);
});

test("listUnconfirmed reports open business rules", () => {
  const list = listUnconfirmed(S);
  assert.ok(!list.includes("pricing.combinationRule"));
  assert.ok(list.includes("policy.driverBufferMinutes"));
  assert.ok(list.includes("policy.cancellationWindowMinutes"));
  assert.ok(!list.includes("policy.paymentTiming"));
  assert.ok(!list.includes("policy.customerCompletionConfirmation"));
  assert.ok(!list.some((k) => k === "pricing.services.hourly"));
});

test("status: allowed and rejected transitions", () => {
  assert.equal(canTransition("requested", "confirmed"), true);
  assert.equal(canTransition("requested", "completed"), false);
  assert.equal(canTransition("in_progress", "completed"), true);
  assert.equal(canTransition("completed", "cancelled"), false);
  assert.equal(isTerminal("completed"), true);
  assert.equal(isTerminal("confirmed"), false);
});

test("overlap detection with and without buffer", () => {
  const a = { start: new Date("2026-10-10T10:00Z"), end: new Date("2026-10-10T12:00Z") };
  const b = { start: new Date("2026-10-10T12:00Z"), end: new Date("2026-10-10T13:00Z") };
  assert.equal(intervalsOverlap(a, b, 0), false);
  assert.equal(intervalsOverlap(a, b, 15), true);
});

test("buffer applies once to the gap: exact gap is free, shorter gap conflicts", () => {
  const a = { start: new Date("2026-10-10T10:00Z"), end: new Date("2026-10-10T12:00Z") };
  // Gap exactly 60 min with a 60 min buffer: back-to-back trips are allowed.
  const exact = { start: new Date("2026-10-10T13:00Z"), end: new Date("2026-10-10T14:00Z") };
  assert.equal(intervalsOverlap(a, exact, 60), false);
  // Gap 59 min: conflict.
  const tight = { start: new Date("2026-10-10T12:59Z"), end: new Date("2026-10-10T14:00Z") };
  assert.equal(intervalsOverlap(a, tight, 60), true);
  assert.equal(findConflicts(a, [exact, tight], 60).length, 1);
});

test("status: in_progress can be cancelled or marked no-show with a reason", () => {
  assert.equal(canTransition("in_progress", "cancelled"), true);
  assert.equal(canTransition("in_progress", "customer_no_show"), true);
  assert.equal(canTransition("in_progress", "confirmed"), false);
});

test("findConflicts reports booking and block conflicts", () => {
  const proposed = { start: new Date("2026-10-10T10:00Z"), end: new Date("2026-10-10T12:00Z") };
  const existing = [
    { start: new Date("2026-10-10T11:00Z"), end: new Date("2026-10-10T11:30Z"), ref: "BK1", kind: "booking" as const },
    { start: new Date("2026-10-10T08:00Z"), end: new Date("2026-10-10T09:00Z"), kind: "availability_block" as const },
  ];
  const c = findConflicts(proposed, existing, 0);
  assert.equal(c.length, 1);
  assert.equal(c[0].ref, "BK1");
});

test("bookingEnd uses duration or explicit end", () => {
  const s = new Date("2026-10-10T10:00Z");
  assert.equal(bookingEnd(s, 4).toISOString(), "2026-10-10T14:00:00.000Z");
  const e = new Date("2026-10-12T10:00Z");
  assert.equal(bookingEnd(s, 4, e).toISOString(), e.toISOString());
});
