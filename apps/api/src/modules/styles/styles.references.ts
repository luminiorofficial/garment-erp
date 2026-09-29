import { eq, inArray } from "drizzle-orm";
import type { Executor } from "../../db/client.js";
import {
  colors,
  customers,
  products,
  sizes,
} from "../../db/schema/index.js";
import { ApiErrors } from "../../lib/api-error.js";

// SHARE locks serialise assignments with deactivation until the mutation
// commits. Unchanged historical references are intentionally not revalidated:
// a style keeps its product/customer/size/color even after they are deactivated.
export async function validateStyleReferences(
  input: {
    productId?: string;
    customerId?: string | null;
    addedSizeIds?: string[];
    addedColorIds?: string[];
  },
  executor: Executor,
  existing?: { productId: string; customerId: string | null },
) {
  if (input.productId && input.productId !== existing?.productId) {
    const [row] = await executor
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .for("share");
    if (!row || !row.isActive)
      throw ApiErrors.validation("productId must reference an active product");
  }

  if (input.customerId && input.customerId !== existing?.customerId) {
    const [row] = await executor
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .for("share");
    if (!row || !row.isActive)
      throw ApiErrors.validation("customerId must reference an active customer");
  }

  if (input.addedSizeIds?.length) {
    const rows = await executor
      .select()
      .from(sizes)
      .where(inArray(sizes.id, input.addedSizeIds))
      .for("share");
    if (rows.length !== input.addedSizeIds.length || rows.some((r) => !r.isActive))
      throw ApiErrors.validation("sizeIds must reference active sizes");
  }

  if (input.addedColorIds?.length) {
    const rows = await executor
      .select()
      .from(colors)
      .where(inArray(colors.id, input.addedColorIds))
      .for("share");
    if (rows.length !== input.addedColorIds.length || rows.some((r) => !r.isActive))
      throw ApiErrors.validation("colorIds must reference active colors");
  }
}
