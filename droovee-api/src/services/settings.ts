import { SettingsModel } from "../models";
import { ActiveSettings, getDefaultSettings } from "../domain/settings";

/**
 * Returns the active settings version from the database, or the code defaults
 * (which are clearly flagged as confirmed/unconfirmed) when none has been saved yet.
 * Stored settings are deep-merged over the defaults, so settings saved before a
 * new key existed (e.g. a new service) still get safe defaults.
 */
export async function getActiveSettings(): Promise<{ version: number; settings: ActiveSettings }> {
  const defaults = getDefaultSettings();
  const doc = await SettingsModel.findOne({ active: true }).sort({ version: -1 }).lean();
  if (!doc) return { version: 0, settings: defaults };
  return {
    version: doc.version,
    settings: {
      pricing: deepMerge(defaults.pricing, doc.pricing) as ActiveSettings["pricing"],
      policy: deepMerge(defaults.policy, doc.policy) as ActiveSettings["policy"],
    },
  };
}

function deepMerge(base: unknown, over: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === "object" && over && typeof over === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
      out[k] = k in out ? deepMerge(out[k], v) : v;
    }
    return out;
  }
  return over === undefined ? base : over;
}
