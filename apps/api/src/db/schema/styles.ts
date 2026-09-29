import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { colors } from "./colors.js";
import { customers } from "./customers.js";
import { products } from "./products.js";
import { sizes } from "./sizes.js";
import { users } from "./users.js";

// A Style is the specific manufacturable, customer-facing garment definition.
// It belongs to a Product (identity/category) and optionally to a Customer
// (buyer-specific styles). Never hard-deleted; deactivated via is_active.
// `code` is the human-readable style number. This is the reference later
// modules (orders, sampling, BOM, production) will point at.
export const styles = pgTable(
  "styles",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    customerId: uuid("customer_id").references(() => customers.id),
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
    index("styles_name_idx").on(table.name),
    index("styles_product_idx").on(table.productId),
    index("styles_customer_idx").on(table.customerId),
  ],
);

// Immutable history: rows are only ever inserted, never updated or deleted, so
// V1/V2/V3 stay reconstructable. A version is a definition snapshot — not an
// approval and not a BOM; those come with Sampling/BOM.
export const styleVersions = pgTable(
  "style_versions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    styleId: uuid("style_id")
      .notNull()
      .references(() => styles.id),
    versionNumber: integer("version_number").notNull(),
    specification: text("specification"),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => [
    unique("style_versions_style_number_unique").on(
      table.styleId,
      table.versionNumber,
    ),
    check("style_versions_number_positive", sql`${table.versionNumber} >= 1`),
  ],
);

// Allowed sizes / colors for a style. Junction rows are plain relationships
// (removing one is not deleting a master); the masters themselves are never
// deleted, and assignments to since-deactivated masters remain visible.
export const styleSizes = pgTable(
  "style_sizes",
  {
    styleId: uuid("style_id")
      .notNull()
      .references(() => styles.id),
    sizeId: uuid("size_id")
      .notNull()
      .references(() => sizes.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.styleId, table.sizeId] }),
    index("style_sizes_size_idx").on(table.sizeId),
  ],
);

export const styleColors = pgTable(
  "style_colors",
  {
    styleId: uuid("style_id")
      .notNull()
      .references(() => styles.id),
    colorId: uuid("color_id")
      .notNull()
      .references(() => colors.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.styleId, table.colorId] }),
    index("style_colors_color_idx").on(table.colorId),
  ],
);
