import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { users } from "./users.js";

// Sizes are never hard-deleted (styles and, later, order breakdowns reference
// them); they are deactivated via is_active. `sequence` orders sizes for
// display and is intentionally not unique. Garment measurement specs are not
// modelled here: they belong to style versions / sampling.
export const sizes = pgTable(
  "sizes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    sequence: integer("sequence").notNull(),
    description: text("description"),
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
    index("sizes_sequence_idx").on(table.sequence),
    check("sizes_sequence_non_negative", sql`${table.sequence} >= 0`),
  ],
);
