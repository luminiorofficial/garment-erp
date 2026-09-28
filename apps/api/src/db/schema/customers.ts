import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { users } from "./users.js";

// Customers are never hard-deleted — they are deactivated via is_active so
// historical orders/invoices keep a valid reference. code is normalized to
// uppercase at the validation layer before it reaches the database.
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    billingAddress: text("billing_address"),
    shippingAddress: text("shipping_address"),
    paymentTerms: text("payment_terms"),
    taxInformation: text("tax_information"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => [index("customers_name_idx").on(table.name)]
);

// At most one primary contact per customer, enforced by a partial unique
// index; the service clears the previous primary before setting a new one.
export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    name: text("name").notNull(),
    designation: text("designation"),
    email: text("email"),
    phone: text("phone"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_contacts_customer_id_idx").on(table.customerId),
    uniqueIndex("customer_contacts_one_primary_idx")
      .on(table.customerId)
      .where(sql`${table.isPrimary}`),
  ]
);
