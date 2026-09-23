import { db, type Executor } from "../db/client.js";
import { auditLogs } from "../db/schema/index.js";

export interface AuditEntry {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function recordAuditLog(entry: AuditEntry, executor: Executor = db) {
  return executor.insert(auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    reason: entry.reason,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  });
}
