/**
 * LOCAL/DEV backup: dumps all Droovee collections to timestamped JSON files.
 * Usage: npm run build && node dist/src/scripts/backup-local.js [outDir]
 * Production should use mongodump + offsite copies on a schedule (see README).
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/droovee?replicaSet=rs0&directConnection=true";

async function main() {
  const outDir = path.join(process.argv[2] ?? path.join(process.cwd(), "backups"), new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-"));
  await mongoose.connect(URI);
  const { CustomerModel, StaffModel, DriverModel, BookingModel, PaymentModel, CouponModel, SettingsModel, TicketModel, AuditLogModel, NotificationModel, RatingModel, ReferralModel, BusinessModel } = await import("../models");
  const collections: Record<string, { find: () => { lean: () => Promise<unknown[]> } }> = {
    customers: CustomerModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    staff: StaffModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    drivers: DriverModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    bookings: BookingModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    payments: PaymentModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    coupons: CouponModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    settings: SettingsModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    tickets: TicketModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    audit: AuditLogModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    notifications: NotificationModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    ratings: RatingModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    referrals: ReferralModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
    business: BusinessModel as unknown as { find: () => { lean: () => Promise<unknown[]> } },
  };
  fs.mkdirSync(outDir, { recursive: true });
  const summary: Record<string, number> = {};
  for (const [name, model] of Object.entries(collections)) {
    const docs = await model.find().lean();
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(docs));
    summary[name] = docs.length;
  }
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify({ at: new Date(), summary }, null, 2));
  console.log(JSON.stringify({ level: "info", msg: "Backup done", outDir, summary }));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
