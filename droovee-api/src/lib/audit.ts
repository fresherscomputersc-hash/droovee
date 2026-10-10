import { AuditLogModel } from "../models";
import type { ClientSession } from "mongoose";

export interface AuditEntry {
  actorId?: string;
  actorKind: "customer" | "staff" | "system";
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  requestId?: string;
}

/**
 * Append-only audit write. Pass a session when the audited change runs in a transaction,
 * so the audit row commits or rolls back with the change.
 */
export async function audit(entry: AuditEntry, session?: ClientSession): Promise<void> {
  await AuditLogModel.create([{ ...entry, at: new Date() }], session ? { session } : undefined);
}
