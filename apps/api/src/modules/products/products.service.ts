import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "@garment-erp/validation";
import { db } from "../../db/client.js";
import type { ActorContext } from "../../lib/actor-context.js";
import { ApiErrors } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import {
  diffFields,
  isUniqueViolation,
  pickFields,
  statusAction,
} from "../../lib/master-helpers.js";
import {
  findProductByCode,
  findProductById,
  insertProduct,
  listProducts,
  updateProduct,
} from "./products.repository.js";

const DUPLICATE_CODE_MESSAGE = "A product with this code already exists";
const PRODUCT_AUDIT_FIELDS = [
  "code",
  "name",
  "category",
  "description",
  "isActive",
] as const;

export function listProductsPage(query: ListProductsQuery) {
  return listProducts(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
  });
}

export async function getProductById(id: string) {
  const [product] = await findProductById(id);
  if (!product) throw ApiErrors.notFound("Product");
  return product;
}

export async function createProduct(
  input: CreateProductInput,
  actor: ActorContext,
) {
  const [existing] = await findProductByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertProduct(
        { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
        tx,
      );
      if (!created) throw new Error("Failed to create product");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "product.created",
          entityType: "product",
          entityId: created.id,
          newValue: pickFields(created, PRODUCT_AUDIT_FIELDS),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}

export async function updateProductDetails(
  id: string,
  input: UpdateProductInput,
  actor: ActorContext,
) {
  const existing = await getProductById(id);

  if (input.code && input.code !== existing.code) {
    const [clash] = await findProductByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateProduct(
        id,
        { ...input, updatedBy: actor.actorUserId },
        tx,
      );
      if (!updated) throw new Error("Failed to update product");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: statusAction("product", existing, input),
          entityType: "product",
          entityId: id,
          ...diffFields(existing, updated, PRODUCT_AUDIT_FIELDS),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}
