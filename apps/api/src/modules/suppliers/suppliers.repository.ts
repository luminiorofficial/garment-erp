import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { supplierContacts, suppliers } from "../../db/schema/index.js";

type SupplierRow = typeof suppliers.$inferSelect;
type SupplierContactRow = typeof supplierContacts.$inferSelect;

export interface SupplierListFilters {
  search?: string;
  isActive?: boolean;
}

export function listSuppliers(page: number, pageSize: number, filters: SupplierListFilters) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(suppliers.isActive, filters.isActive));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(ilike(suppliers.name, pattern), ilike(suppliers.code, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(suppliers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(suppliers.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findSupplierById(id: string) {
  return db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
}

export function findSupplierByCode(code: string) {
  return db.select().from(suppliers).where(eq(suppliers.code, code)).limit(1);
}

export function insertSupplier(
  values: typeof suppliers.$inferInsert,
  executor: Executor = db
): Promise<SupplierRow[]> {
  return executor.insert(suppliers).values(values).returning();
}

export function updateSupplier(
  id: string,
  values: Partial<typeof suppliers.$inferInsert>,
  executor: Executor = db
): Promise<SupplierRow[]> {
  return executor
    .update(suppliers)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(suppliers.id, id))
    .returning();
}

export function listContactsForSupplier(supplierId: string) {
  return db
    .select()
    .from(supplierContacts)
    .where(eq(supplierContacts.supplierId, supplierId))
    .orderBy(asc(supplierContacts.createdAt));
}

export function findContactById(supplierId: string, contactId: string) {
  return db
    .select()
    .from(supplierContacts)
    .where(and(eq(supplierContacts.id, contactId), eq(supplierContacts.supplierId, supplierId)))
    .limit(1);
}

export function insertContact(
  values: typeof supplierContacts.$inferInsert,
  executor: Executor = db
): Promise<SupplierContactRow[]> {
  return executor.insert(supplierContacts).values(values).returning();
}

export function updateContact(
  id: string,
  values: Partial<typeof supplierContacts.$inferInsert>,
  executor: Executor = db
): Promise<SupplierContactRow[]> {
  return executor
    .update(supplierContacts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(supplierContacts.id, id))
    .returning();
}

export function clearPrimaryContact(supplierId: string, executor: Executor = db): Promise<unknown> {
  return executor
    .update(supplierContacts)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(supplierContacts.supplierId, supplierId), eq(supplierContacts.isPrimary, true)));
}
