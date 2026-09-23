import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { users } from "./users.js";

// The raw session token only ever lives in the httpOnly cookie and briefly
// in memory; only its SHA-256 hash is stored here, so a database leak alone
// does not hand out valid sessions.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

// Authentication telemetry (login attempts, logouts) — separate from
// audit_logs because it is higher-volume, has no old/new-value concept, and
// may warrant different retention. See docs/decisions/006-rbac-model.md.
export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    eventType: text("event_type").notNull(), // "login_success" | "login_failure" | "logout"
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    emailAttempted: text("email_attempted"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("security_events_user_id_idx").on(table.userId)]
);
