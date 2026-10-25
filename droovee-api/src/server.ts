import mongoose from "mongoose";
import { config, assertRequiredConfig } from "./config";
import { createApp } from "./app";
import { listUnconfirmed } from "./domain/settings";
import { getActiveSettings } from "./services/settings";

async function main() {
  assertRequiredConfig();
  // Index creation is explicit in production (`npm run db:indexes`), so a cold
  // start is a connect + read, not a full index sync. Local development keeps
  // Mongoose's automatic index creation for convenience.
  await mongoose.connect(config.mongoUri, { autoIndex: config.env !== "production" });

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
