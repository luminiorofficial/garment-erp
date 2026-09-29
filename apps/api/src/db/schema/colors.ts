import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { users } from "./users.js";

// A commercial/design color reference; never hard-deleted. hex_value is only
// a display swatch — actual fabric shade/lot traceability belongs to the
// future fabric/inventory modules.
export const colors = pgTable(
  "colors",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    reference: text("reference"),
    hexValue: text("hex_value"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => [
    check(
      "colors_hex_value_format",
      sql`${table.hexValue} IS NULL OR ${table.hexValue} ~ '^#[0-9A-F]{6}$'`,
    ),
  ],
);
