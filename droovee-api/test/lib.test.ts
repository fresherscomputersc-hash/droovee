import { test } from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../src/lib/permissions";
import { normalisePhone, newBookingNumber, maskPhone } from "../src/lib/ids";
import { passwordIssues } from "../src/lib/password";
import { isLateNight } from "../src/domain/pricing";

test("finance cannot change pricing or assign drivers", () => {
  assert.equal(hasPermission("finance", "pricing:write"), false);
  assert.equal(hasPermission("finance", "bookings:assign"), false);
  assert.equal(hasPermission("finance", "payments:refund"), true);
});

test("support is read-only on bookings", () => {
  assert.equal(hasPermission("support", "bookings:read"), true);
  assert.equal(hasPermission("support", "bookings:status"), false);
  assert.equal(hasPermission("support", "payments:refund"), false);
});

test("operations can assign and override conflicts but cannot change fares", () => {
  assert.equal(hasPermission("operations", "bookings:assign"), true);
  assert.equal(hasPermission("operations", "conflict:override"), true);
  assert.equal(hasPermission("operations", "bookings:fare_adjust"), false);
});

test("owner has every permission", () => {
  assert.equal(hasPermission("owner_super_admin", "staff:manage"), true);
  assert.equal(hasPermission("owner_super_admin", "pricing:write"), true);
});

test("phone normalisation accepts common Indian formats", () => {
  assert.equal(normalisePhone("9876543210"), "+919876543210");
  assert.equal(normalisePhone("09876543210"), "+919876543210");
  assert.equal(normalisePhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalisePhone("919876543210"), "+919876543210");
  assert.equal(normalisePhone("12345"), null);
  assert.equal(normalisePhone("5876543210"), null);
});

test("booking numbers are prefixed and unambiguous", () => {
  const n = newBookingNumber();
  assert.match(n, /^DRV-[A-HJ-NP-Z2-9]{8}$/);
});

test("late-night window wraps midnight (IST)", () => {
  const at = (ist: string) => new Date(`2026-10-10T${ist}:00+05:30`);
  assert.equal(isLateNight(at("23:30"), 22, 6), true);
  assert.equal(isLateNight(at("05:59"), 22, 6), true);
  assert.equal(isLateNight(at("06:00"), 22, 6), false);
  assert.equal(isLateNight(at("12:00"), 22, 6), false);
});

test("phone masking keeps country code and last two digits", () => {
  assert.equal(maskPhone("+919876500001"), "+91******01");
  assert.equal(maskPhone("9876500001"), "******01");
  assert.equal(maskPhone("123"), "****");
});

test("password policy rejects short, common and simple passwords", () => {
  assert.ok(passwordIssues("short1!", 10, 2) !== null); // too short
  assert.ok(passwordIssues("password1", 10, 2) !== null); // blocklisted
  assert.ok(passwordIssues("abcdefghij", 10, 2) !== null); // single class
  assert.equal(passwordIssues("Sup3r-secret-pass", 10, 2), null);
  assert.ok(passwordIssues("alllowercase12", 12, 3) !== null); // 2 classes, need 3
  assert.equal(passwordIssues("Staff-password-123", 12, 3), null);
});
