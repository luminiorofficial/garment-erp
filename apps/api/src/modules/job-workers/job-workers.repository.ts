import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { jobWorkers } from "../../db/schema/index.js";

type JobWorkerRow = typeof jobWorkers.$inferSelect;

export interface JobWorkerListFilters {
  search?: string;
  isActive?: boolean;
  processId?: string;
}

export function listJobWorkers(
  page: number,
  pageSize: number,
  filters: JobWorkerListFilters,
) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(jobWorkers.isActive, filters.isActive));
  }

  if (filters.processId) {
    conditions.push(eq(jobWorkers.processId, filters.processId));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(jobWorkers.name, pattern),
      ilike(jobWorkers.code, pattern),
      ilike(jobWorkers.contactPerson, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(jobWorkers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(jobWorkers.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findJobWorkerById(id: string) {
  return db.select().from(jobWorkers).where(eq(jobWorkers.id, id)).limit(1);
}

export function findJobWorkerByCode(code: string) {
  return db.select().from(jobWorkers).where(eq(jobWorkers.code, code)).limit(1);
}

export function insertJobWorker(
  values: typeof jobWorkers.$inferInsert,
  executor: Executor = db,
): Promise<JobWorkerRow[]> {
  return executor.insert(jobWorkers).values(values).returning();
}

export function updateJobWorker(
  id: string,
  values: Partial<typeof jobWorkers.$inferInsert>,
  executor: Executor = db,
): Promise<JobWorkerRow[]> {
  return executor
    .update(jobWorkers)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(jobWorkers.id, id))
    .returning();
}
