import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { products } from "../../db/schema/index.js";

type ProductRow = typeof products.$inferSelect;

export interface ProductListFilters {
  search?: string;
  isActive?: boolean;
}

export function listProducts(
  page: number,
  pageSize: number,
  filters: ProductListFilters,
) {
  const conditions: SQL[] = [];

  if (typeof filters.isActive === "boolean") {
    conditions.push(eq(products.isActive, filters.isActive));
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(products.name, pattern),
      ilike(products.code, pattern),
      ilike(products.category, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(products.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export function findProductById(id: string) {
  return db.select().from(products).where(eq(products.id, id)).limit(1);
}

export function findProductByCode(code: string) {
  return db.select().from(products).where(eq(products.code, code)).limit(1);
}

export function insertProduct(
  values: typeof products.$inferInsert,
  executor: Executor = db,
): Promise<ProductRow[]> {
  return executor.insert(products).values(values).returning();
}

export function updateProduct(
  id: string,
  values: Partial<typeof products.$inferInsert>,
  executor: Executor = db,
): Promise<ProductRow[]> {
  return executor
    .update(products)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
}
