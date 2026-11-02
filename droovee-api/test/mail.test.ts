/**
 * Pure unit tests for the owner new-booking alert: template contents and the
 * ADMIN_NOTIFY_EMAIL recipient switch. No DB, no SMTP.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newBookingAlertMail } from "../src/services/mail";
import { config } from "../src/config";

const withEnv = (key: string, value: string | undefined, fn: () => void) => {
  const saved = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    fn();
  } finally {
    if (saved === undefined) delete process.env[key];
    else process.env[key] = saved;
  }
};

test("admin alert recipient defaults to the client's Gmail", () => {
  withEnv("ADMIN_NOTIFY_EMAIL", undefined, () => {
    assert.equal(config.adminNotifyEmail, "droovee.admin@gmail.com");
    assert.equal(config.adminNotifyEnabled, true);
  });
});

test("ADMIN_NOTIFY_EMAIL overrides the recipient, and empty disables alerts", () => {
  withEnv("ADMIN_NOTIFY_EMAIL", " dispatch@droovee.test ", () => {
    assert.equal(config.adminNotifyEmail, "dispatch@droovee.test");
    assert.equal(config.adminNotifyEnabled, true);
  });
  withEnv("ADMIN_NOTIFY_EMAIL", "", () => {
    assert.equal(config.adminNotifyEmail, "");
    assert.equal(config.adminNotifyEnabled, false);
  });
});

test("new booking alert mail carries every dispatch fact and the admin link", () => {
  const start = new Date("2030-06-01T10:00:00+05:30");
  const m = newBookingAlertMail({
    bookingNumber: "DRV-TEST1234",
    customerName: "Asha Patel",
    customerPhone: "+919000000001",
    serviceType: "hourly",
    start,
    pickup: "Jayadev Vihar, Bhubaneswar",
    destination: "Biju Patnaik Airport",
    carModel: "Maruti Swift",
    transmission: "manual",
    durationHours: 2,
    nights: 0,
    couponCode: "LAUNCH99",
    total: 99,
    source: "website",
    adminUrl: "http://localhost:3000/admin/bookings/64b000000000000000000001",
  });

  assert.match(m.subject, /#DRV-TEST1234/);
  assert.match(m.subject, /₹99/);

  for (const fact of ["DRV-TEST1234", "Asha Patel", "+919000000001", "hourly", "Jayadev Vihar", "Biju Patnaik Airport", "Maruti Swift", "₹99", "LAUNCH99", "website"]) {
    assert.ok(m.text.includes(fact), `text mail must mention ${fact}`);
  }
  assert.match(m.text, /1 Jun 2030|Jun 1, 2030/, `text mail must show the pickup date, got: ${m.text}`);

  const url = "http://localhost:3000/admin/bookings/64b000000000000000000001";
  assert.ok(m.html.includes(url), "html must link to the admin booking page");
  assert.ok(m.html.includes("DRV-TEST1234"));
  assert.ok(m.html.includes("Asha Patel (+919000000001)"));
});

test("new booking alert mail escapes HTML in customer-supplied fields", () => {
  const m = newBookingAlertMail({
    bookingNumber: "DRV-ESC1234",
    customerName: `<img src=x onerror=alert(1)>`,
    customerPhone: "+919000000003",
    serviceType: "hourly",
    start: new Date("2030-06-01T10:00:00+05:30"),
    pickup: `<a href="https://evil.test">click here</a>`,
    destination: `Bhubaneswar & "Cuttack"`,
    total: 99,
  });

  assert.ok(!m.html.includes("<img src=x"), "raw tags from customer input must not survive");
  assert.ok(!m.html.includes('<a href="https://evil.test"'), "raw links from customer input must not survive");
  assert.ok(m.html.includes("&lt;img src=x onerror=alert(1)&gt;"), "escaped form is expected");
  assert.ok(m.html.includes("Bhubaneswar &amp; &quot;Cuttack&quot;"), "ampersands and quotes are escaped");
});

test("new booking alert mail degrades gracefully without optional fields", () => {
  const m = newBookingAlertMail({
    bookingNumber: "DRV-PLAIN01",
    customerName: "Ravi",
    customerPhone: "+919000000002",
    serviceType: "monthly_office",
    start: new Date("2030-07-01T08:00:00+05:30"),
    pickup: "Patia, Bhubaneswar",
    total: 0,
  });

  assert.match(m.subject, /#DRV-PLAIN01/);
  assert.ok(!m.text.includes("Destination:"), "no destination line when there is none");
  assert.ok(!m.text.includes("Coupon applied"), "no coupon line when none was used");
  assert.ok(m.html.includes("https://droovee.in/admin/bookings"), "falls back to the bookings list URL");
});
