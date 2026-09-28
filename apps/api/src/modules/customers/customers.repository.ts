import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { customerContacts, customers } from "../../db/schema/index.js";

type CustomerRow = typeof customers.$inferSelect;
type CustomerContactRow = typeof customerContacts.$inferSelect;

export interface CustomerListFilters {
  search?: string;
  isActive?: boolean;
}

export function listCustomers(page: number, pageSize: number, filters: CustomerListFilters) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(customers.isActive, filters.isActive));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(ilike(customers.name, pattern), ilike(customers.code, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(customers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(customers.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findCustomerById(id: string) {
  return db.select().from(customers).where(eq(customers.id, id)).limit(1);
}

export function findCustomerByCode(code: string) {
  return db.select().from(customers).where(eq(customers.code, code)).limit(1);
}

export function insertCustomer(
  values: typeof customers.$inferInsert,
  executor: Executor = db
): Promise<CustomerRow[]> {
  return executor.insert(customers).values(values).returning();
}

export function updateCustomer(
  id: string,
  values: Partial<typeof customers.$inferInsert>,
  executor: Executor = db
): Promise<CustomerRow[]> {
  return executor
    .update(customers)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
}

export function listContactsForCustomer(customerId: string) {
  return db
    .select()
    .from(customerContacts)
    .where(eq(customerContacts.customerId, customerId))
    .orderBy(asc(customerContacts.createdAt));
}

export function findContactById(customerId: string, contactId: string) {
  return db
    .select()
    .from(customerContacts)
    .where(and(eq(customerContacts.id, contactId), eq(customerContacts.customerId, customerId)))
    .limit(1);
}

export function insertContact(
  values: typeof customerContacts.$inferInsert,
  executor: Executor = db
): Promise<CustomerContactRow[]> {
  return executor.insert(customerContacts).values(values).returning();
}

export function updateContact(
  id: string,
  values: Partial<typeof customerContacts.$inferInsert>,
  executor: Executor = db
): Promise<CustomerContactRow[]> {
  return executor
    .update(customerContacts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(customerContacts.id, id))
    .returning();
}

export function clearPrimaryContact(customerId: string, executor: Executor = db): Promise<unknown> {
  return executor
    .update(customerContacts)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(customerContacts.customerId, customerId), eq(customerContacts.isPrimary, true)));
}
