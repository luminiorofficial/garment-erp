import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { users } from "./users.js";

// Job workers are external subcontractors (stitching, embroidery, printing,
// washing, ...). Like customers/suppliers they are never hard-deleted — they
// are deactivated via is_active so future job work orders keep a valid
// reference. code is normalized to uppercase at the validation layer.
//
// Contact details live on the row (contact_person/email/phone) rather than in
// a separate contacts table: a job worker is typically a small unit with one
// point of contact. Add a contacts table only if multiple contacts are needed.
//
// process is a normalized uppercase code (e.g. STITCHING) stored as plain
// text, deliberately not a Postgres/app enum, so new processes need no
// migration. It is a temporary representation until a Process Master exists;
// that module can then replace it with a foreign key. Likewise capacity_unit
// (PCS, KG, MTR, ...) is plain text until a Unit Master exists, and
// rate_agreement is a free-text summary until structured job work rates exist.
//
// There are intentionally no performance columns (rejection rate, on-time %,
// turnaround, ...): those must be derived from real job work transactions,
// never entered by hand on the master record.
export const jobWorkers = pgTable(
  "job_workers",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    email: text("email"),
    phone: text("phone"),
    billingAddress: text("billing_address"),
    operatingAddress: text("operating_address"),
    process: text("process"),
    capacityPerDay: integer("capacity_per_day"),
    capacityUnit: text("capacity_unit"),
    leadTimeDays: integer("lead_time_days"),
    rateAgreement: text("rate_agreement"),
    paymentTerms: text("payment_terms"),
    taxInformation: text("tax_information"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => [
    index("job_workers_name_idx").on(table.name),
    index("job_workers_process_idx").on(table.process),
    check("job_workers_capacity_per_day_positive", sql`${table.capacityPerDay} > 0`),
    // A capacity figure is meaningless without its unit, and vice versa.
    check(
      "job_workers_capacity_unit_paired",
      sql`(${table.capacityPerDay} IS NULL) = (${table.capacityUnit} IS NULL)`
    ),
    check("job_workers_lead_time_days_non_negative", sql`${table.leadTimeDays} >= 0`),
  ]
);
