import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { colors } from "../../db/schema/index.js";

type ColorRow = typeof colors.$inferSelect;

export interface ColorListFilters {
  search?: string;
  isActive?: boolean;
}

export function listColors(
  page: number,
  pageSize: number,
  filters: ColorListFilters,
) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(colors.isActive, filters.isActive));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(colors.name, pattern),
      ilike(colors.code, pattern),
      ilike(colors.reference, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(colors)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(colors.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findColorById(id: string) {
  return db.select().from(colors).where(eq(colors.id, id)).limit(1);
}

export function findColorByCode(code: string) {
  return db.select().from(colors).where(eq(colors.code, code)).limit(1);
}

export function insertColor(
  values: typeof colors.$inferInsert,
  executor: Executor = db,
): Promise<ColorRow[]> {
  return executor.insert(colors).values(values).returning();
}

export function updateColor(
  id: string,
  values: Partial<typeof colors.$inferInsert>,
  executor: Executor = db,
): Promise<ColorRow[]> {
  return executor
    .update(colors)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(colors.id, id))
    .returning();
}
