/**
 * LOCAL DEV ONLY. Seeds demo data against an already-running MongoDB
 * replica set on 127.0.0.1:27017 (started manually via mongod --replSet rs0).
 * Idempotent: wipes droovee collections first.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/droovee?replicaSet=rs0&directConnection=true";

async function main() {
  await mongoose.connect(URI);
  try {
    await (mongoose.connection.db as never as { admin: () => { command: (c: object) => Promise<unknown> } })
      .admin()
      .command({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] } });
    console.log("replica set initiated");
  } catch (e) {
    console.log(`rs.initiate skipped: ${(e as Error).message}`);
  }

  const m = await import("../models");

  await Promise.all([
    m.StaffModel.deleteMany({}),
    m.DriverModel.deleteMany({}),
    m.CouponModel.deleteMany({}),
    m.CouponRedemptionModel.deleteMany({}),
    m.CustomerModel.deleteMany({}),
    m.BookingModel.deleteMany({}),
  ]);

  const staffPass = await bcrypt.hash("Admin#2026pass", 10);
  await m.StaffModel.create([
    { name: "Owner", email: "owner@droovee.in", role: "owner_super_admin", passwordHash: staffPass },
    { name: "Operations", email: "ops@droovee.in", role: "operations", passwordHash: staffPass },
    { name: "Finance", email: "finance@droovee.in", role: "finance", passwordHash: staffPass },
    { name: "Support", email: "support@droovee.in", role: "support", passwordHash: staffPass },
  ]);

  const drivers = await m.DriverModel.create([
    { employeeCode: "DRV-001", name: "Ramesh Behera", phone: "+919876500101", serviceZones: ["Patia", "Jayadev Vihar"] },
    { employeeCode: "DRV-002", name: "Suresh Sahu", phone: "+919876500102", serviceZones: ["Nayapalli", "Saheed Nagar"] },
    { employeeCode: "DRV-003", name: "Mahesh Nayak", phone: "+919876500103", serviceZones: ["Airport", "Station"] },
    { employeeCode: "DRV-004", name: "Ganesh Pradhan", phone: "+919876500104", serviceZones: ["Patia"] },
  ]);

  await m.CouponModel.create({
    code: "LAUNCH99",
    type: "first_hour_price",
    value: 99,
    validFrom: new Date("2026-01-01"),
    validTo: new Date("2030-12-31"),
    eligibleServices: ["hourly"],
    usageLimit: 0,
    perCustomerLimit: 1,
  });

  const cust = await m.CustomerModel.create({
    name: "Demo Customer",
    phone: "+919876500001",
    email: "demo@droovee.in",
    passwordHash: await bcrypt.hash("Customer#2026", 10),
    phoneVerified: false,
  });

  const { newBookingNumber } = await import("../lib/ids");
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 2);
  base.setUTCHours(4, 30, 0, 0); // 10:00 IST
  const demo = [
    { serviceType: "hourly", hours: 2, status: "requested", addr: "Jayadev Vihar, Bhubaneswar", car: "Maruti Swift", fare: 188 },
    { serviceType: "half_day", hours: 4, status: "confirmed", addr: "Patia Square, Bhubaneswar", car: "Hyundai Creta", fare: 379 },
    { serviceType: "full_day", hours: 8, status: "driver_assigned", addr: "Nayapalli, Bhubaneswar", car: "Honda City", fare: 849, driver: drivers[1] },
    { serviceType: "airport_pickup_drop", hours: 2, status: "completed", addr: "Bhubaneswar Airport", car: "Tata Nexon", fare: 318, driver: drivers[2], dayOffset: -3 },
  ];
  for (const [i, d] of demo.entries()) {
    const start = new Date(base.getTime() + i * 3 * 3_600_000 + ((d as { dayOffset?: number }).dayOffset ?? 0) * 86_400_000);
    await m.BookingModel.create({
      bookingNumber: newBookingNumber(),
      customerId: cust._id,
      customerSnapshot: { name: cust.name, phone: cust.phone },
      serviceType: d.serviceType as never,
      pickup: { address: d.addr },
      scheduledStart: start,
      scheduledEnd: new Date(start.getTime() + d.hours * 3_600_000),
      durationHours: d.hours,
      carModel: d.car,
      transmission: "automatic",
      instructions: "",
      status: d.status as never,
      driverId: d.driver?._id,
      fareEstimate: { total: d.fare, lines: [{ label: "Estimate", amount: d.fare }], usesUnconfirmedRules: true, computedAt: new Date(), settingsVersion: 0 },
      finalFare: d.status === "completed" ? d.fare : undefined,
      statusHistory: [{ from: null, to: d.status, actorKind: "system", at: new Date() }],
    });
  }

  console.log(JSON.stringify({ level: "info", msg: "Seed done", seeded: { staff: 4, drivers: drivers.length, bookings: demo.length } }));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
