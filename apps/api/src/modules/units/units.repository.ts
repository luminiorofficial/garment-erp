import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { units } from "../../db/schema/index.js";

type UnitRow = typeof units.$inferSelect;

export interface UnitListFilters {
  search?: string;
  isActive?: boolean;
}

export function listUnits(
  page: number,
  pageSize: number,
  filters: UnitListFilters,
) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(units.isActive, filters.isActive));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(units.name, pattern),
      ilike(units.code, pattern),
      ilike(units.symbol, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(units)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(units.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findUnitById(id: string) {
  return db.select().from(units).where(eq(units.id, id)).limit(1);
}

export function findUnitByCode(code: string) {
  return db.select().from(units).where(eq(units.code, code)).limit(1);
}

export function insertUnit(
  values: typeof units.$inferInsert,
  executor: Executor = db,
): Promise<UnitRow[]> {
  return executor.insert(units).values(values).returning();
}

export function updateUnit(
  id: string,
  values: Partial<typeof units.$inferInsert>,
  executor: Executor = db,
): Promise<UnitRow[]> {
  return executor
    .update(units)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(units.id, id))
    .returning();
}
