import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { users } from "./users.js";

// Suppliers are never hard-deleted — they are deactivated via is_active so
// historical purchase orders/inward records keep a valid reference. code is
// normalized to uppercase at the validation layer before it reaches the
// database. The unique constraint on code also serves as its lookup index.
//
// rating is a whole-number 1–5 score (5 = best); NULL means "not yet rated".
// lead_time_days is the typical order-to-delivery time in calendar days.
// Both ranges are enforced here as well as in @garment-erp/validation.
export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    billingAddress: text("billing_address"),
    shippingAddress: text("shipping_address"),
    paymentTerms: text("payment_terms"),
    leadTimeDays: integer("lead_time_days"),
    rating: smallint("rating"),
    taxInformation: text("tax_information"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => [
    index("suppliers_name_idx").on(table.name),
    check("suppliers_lead_time_days_non_negative", sql`${table.leadTimeDays} >= 0`),
    check("suppliers_rating_range", sql`${table.rating} BETWEEN 1 AND 5`),
  ]
);

// At most one primary contact per supplier, enforced by a partial unique
// index; the service clears the previous primary before setting a new one.
export const supplierContacts = pgTable(
  "supplier_contacts",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    name: text("name").notNull(),
    designation: text("designation"),
    email: text("email"),
    phone: text("phone"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("supplier_contacts_supplier_id_idx").on(table.supplierId),
    uniqueIndex("supplier_contacts_one_primary_idx")
      .on(table.supplierId)
      .where(sql`${table.isPrimary}`),
  ]
);
