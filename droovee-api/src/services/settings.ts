import { SettingsModel } from "../models";
import { ActiveSettings, getDefaultSettings } from "../domain/settings";

/**
 * Returns the active settings version from the database, or the code defaults
 * (which are clearly flagged as confirmed/unconfirmed) when none has been saved yet.
 */
export async function getActiveSettings(): Promise<{ version: number; settings: ActiveSettings }> {
  const doc = await SettingsModel.findOne({ active: true }).sort({ version: -1 }).lean();
  if (!doc) return { version: 0, settings: getDefaultSettings() };
  return {
    version: doc.version,
    settings: { pricing: doc.pricing as ActiveSettings["pricing"], policy: doc.policy as ActiveSettings["policy"] },
  };
}
