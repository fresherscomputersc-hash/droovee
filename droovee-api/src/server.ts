import mongoose from "mongoose";
import { config, assertRequiredConfig } from "./config";
import { createApp } from "./app";
import { BookingModel, CustomerModel, DriverModel } from "./models";
import { listUnconfirmed } from "./domain/settings";
import { getActiveSettings } from "./services/settings";

async function main() {
  assertRequiredConfig();
  await mongoose.connect(config.mongoUri);
  // Indexes are created by Mongoose on connect. Production should run migrations explicitly.
  await Promise.all([BookingModel.syncIndexes(), CustomerModel.syncIndexes(), DriverModel.syncIndexes()]);

  const { settings } = await getActiveSettings();
  const open = listUnconfirmed(settings);
  if (config.env === "production" && open.length) {
    // Launch gate: refuse to start in production with unconfirmed business rules.
    throw new Error(`Unconfirmed settings block production start: ${open.join(", ")}`);
  }
  if (open.length) console.warn(JSON.stringify({ level: "warn", msg: "Unconfirmed settings in use", settings: open }));

  const app = createApp();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(JSON.stringify({ level: "info", msg: "Droovee API listening", port: config.port }));
  });
}

main().catch((e) => {
  console.error(JSON.stringify({ level: "fatal", msg: (e as Error).message }));
  process.exit(1);
});
