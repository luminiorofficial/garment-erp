import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { sizes } from "../../db/schema/index.js";

type SizeRow = typeof sizes.$inferSelect;

export interface SizeListFilters {
  search?: string;
  isActive?: boolean;
}

export function listSizes(
  page: number,
  pageSize: number,
  filters: SizeListFilters,
) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(sizes.isActive, filters.isActive));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(sizes.name, pattern),
      ilike(sizes.code, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(sizes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(sizes.sequence), asc(sizes.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findSizeById(id: string) {
  return db.select().from(sizes).where(eq(sizes.id, id)).limit(1);
}

export function findSizeByCode(code: string) {
  return db.select().from(sizes).where(eq(sizes.code, code)).limit(1);
}

export function insertSize(
  values: typeof sizes.$inferInsert,
  executor: Executor = db,
): Promise<SizeRow[]> {
  return executor.insert(sizes).values(values).returning();
}

export function updateSize(
  id: string,
  values: Partial<typeof sizes.$inferInsert>,
  executor: Executor = db,
): Promise<SizeRow[]> {
  return executor
    .update(sizes)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(sizes.id, id))
    .returning();
}
