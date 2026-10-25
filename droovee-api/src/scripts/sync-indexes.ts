/**
 * Explicit index sync. Run this after deploying schema/index changes:
 *
 *   npm run db:indexes
 *
 * Production starts with autoIndex disabled, so this is the only place that
 * creates or drops indexes in production. It is safe to run more than once.
 */
import mongoose from "mongoose";
import { config } from "../config";
import "../models";

async function main() {
  await mongoose.connect(config.mongoUri, { autoIndex: false });
  const names = mongoose.modelNames();
  for (const name of names) {
    const dropped = await mongoose.model(name).syncIndexes();
    console.log(JSON.stringify({ level: "info", msg: "indexes synced", model: name, dropped }));
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(JSON.stringify({ level: "fatal", msg: (e as Error).message }));
  process.exit(1);
});
