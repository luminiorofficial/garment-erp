import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import {
  styleColors,
  styleSizes,
  styleVersions,
  styles,
} from "../../db/schema/index.js";

type StyleRow = typeof styles.$inferSelect;
type StyleVersionRow = typeof styleVersions.$inferSelect;

export interface StyleListFilters {
  search?: string;
  isActive?: boolean;
  productId?: string;
  customerId?: string;
}

export function listStyles(
  page: number,
  pageSize: number,
  filters: StyleListFilters,
) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(styles.isActive, filters.isActive));
  }
  if (filters.productId) conditions.push(eq(styles.productId, filters.productId));
  if (filters.customerId) conditions.push(eq(styles.customerId, filters.customerId));

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(styles.name, pattern),
      ilike(styles.code, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(styles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(styles.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findStyleById(id: string) {
  return db.select().from(styles).where(eq(styles.id, id)).limit(1);
}

export function findStyleByCode(code: string) {
  return db.select().from(styles).where(eq(styles.code, code)).limit(1);
}

// Serialises concurrent writers of one style (edits, version numbering) until
// the surrounding transaction commits.
export function lockStyle(id: string, executor: Executor): Promise<StyleRow[]> {
  return executor.select().from(styles).where(eq(styles.id, id)).for("update");
}

export function insertStyle(
  values: typeof styles.$inferInsert,
  executor: Executor = db,
): Promise<StyleRow[]> {
  return executor.insert(styles).values(values).returning();
}

export function updateStyle(
  id: string,
  values: Partial<typeof styles.$inferInsert>,
  executor: Executor = db,
): Promise<StyleRow[]> {
  return executor
    .update(styles)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(styles.id, id))
    .returning();
}

export async function listStyleSizeIds(styleId: string, executor: Executor = db) {
  const rows = await executor
    .select({ id: styleSizes.sizeId })
    .from(styleSizes)
    .where(eq(styleSizes.styleId, styleId));
  return rows.map((r) => r.id).sort();
}

export async function listStyleColorIds(styleId: string, executor: Executor = db) {
  const rows = await executor
    .select({ id: styleColors.colorId })
    .from(styleColors)
    .where(eq(styleColors.styleId, styleId));
  return rows.map((r) => r.id).sort();
}

export async function insertStyleSizes(
  styleId: string,
  sizeIds: string[],
  executor: Executor,
) {
  if (sizeIds.length === 0) return;
  await executor
    .insert(styleSizes)
    .values(sizeIds.map((sizeId) => ({ styleId, sizeId })));
}

export async function deleteStyleSizes(
  styleId: string,
  sizeIds: string[],
  executor: Executor,
) {
  if (sizeIds.length === 0) return;
  await executor
    .delete(styleSizes)
    .where(and(eq(styleSizes.styleId, styleId), inArray(styleSizes.sizeId, sizeIds)));
}

export async function insertStyleColors(
  styleId: string,
  colorIds: string[],
  executor: Executor,
) {
  if (colorIds.length === 0) return;
  await executor
    .insert(styleColors)
    .values(colorIds.map((colorId) => ({ styleId, colorId })));
}

export async function deleteStyleColors(
  styleId: string,
  colorIds: string[],
  executor: Executor,
) {
  if (colorIds.length === 0) return;
  await executor
    .delete(styleColors)
    .where(
      and(eq(styleColors.styleId, styleId), inArray(styleColors.colorId, colorIds)),
    );
}

export function listVersionsForStyle(styleId: string) {
  return db
    .select()
    .from(styleVersions)
    .where(eq(styleVersions.styleId, styleId))
    .orderBy(desc(styleVersions.versionNumber));
}

export function findStyleVersion(styleId: string, versionId: string) {
  return db
    .select()
    .from(styleVersions)
    .where(and(eq(styleVersions.styleId, styleId), eq(styleVersions.id, versionId)))
    .limit(1);
}

export async function nextVersionNumber(styleId: string, executor: Executor) {
  const [row] = await executor
    .select({ max: sql<number | null>`max(${styleVersions.versionNumber})` })
    .from(styleVersions)
    .where(eq(styleVersions.styleId, styleId));
  return (row?.max ?? 0) + 1;
}

export function insertStyleVersion(
  values: typeof styleVersions.$inferInsert,
  executor: Executor,
): Promise<StyleVersionRow[]> {
  return executor.insert(styleVersions).values(values).returning();
}
