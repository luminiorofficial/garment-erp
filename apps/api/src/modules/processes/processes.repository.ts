import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { processes } from "../../db/schema/index.js";

type ProcessRow = typeof processes.$inferSelect;

export interface ProcessListFilters {
  search?: string;
  isActive?: boolean;
}

export function listProcesses(
  page: number,
  pageSize: number,
  filters: ProcessListFilters,
) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(processes.isActive, filters.isActive));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(processes.name, pattern),
      ilike(processes.code, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(processes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(processes.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findProcessById(id: string) {
  return db.select().from(processes).where(eq(processes.id, id)).limit(1);
}

export function findProcessByCode(code: string) {
  return db.select().from(processes).where(eq(processes.code, code)).limit(1);
}

export function insertProcess(
  values: typeof processes.$inferInsert,
  executor: Executor = db,
): Promise<ProcessRow[]> {
  return executor.insert(processes).values(values).returning();
}

export function updateProcess(
  id: string,
  values: Partial<typeof processes.$inferInsert>,
  executor: Executor = db,
): Promise<ProcessRow[]> {
  return executor
    .update(processes)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(processes.id, id))
    .returning();
}
