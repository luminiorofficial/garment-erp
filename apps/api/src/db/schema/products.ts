import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { users } from "./users.js";

// A Product is the general garment identity/category (e.g. "Crew-neck
// T-shirt"). Specific manufacturable variants are Styles. Never hard-deleted;
// deactivated via is_active. No stock, BOM, cost or production data lives here.
export const products = pgTable(
  "products",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
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
    index("products_name_idx").on(table.name),
    index("products_category_idx").on(table.category),
  ],
);
