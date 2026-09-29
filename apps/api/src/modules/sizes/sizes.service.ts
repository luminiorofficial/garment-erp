import type {
  CreateSizeInput,
  ListSizesQuery,
  UpdateSizeInput,
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
  findSizeByCode,
  findSizeById,
  insertSize,
  listSizes,
  updateSize,
} from "./sizes.repository.js";

const DUPLICATE_CODE_MESSAGE = "A size with this code already exists";
const SIZE_AUDIT_FIELDS = [
  "code",
  "name",
  "sequence",
  "description",
  "isActive",
] as const;

export function listSizesPage(query: ListSizesQuery) {
  return listSizes(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
  });
}

export async function getSizeById(id: string) {
  const [size] = await findSizeById(id);
  if (!size) throw ApiErrors.notFound("Size");
  return size;
}

export async function createSize(input: CreateSizeInput, actor: ActorContext) {
  const [existing] = await findSizeByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertSize(
        { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
        tx,
      );
      if (!created) throw new Error("Failed to create size");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "size.created",
          entityType: "size",
          entityId: created.id,
          newValue: pickFields(created, SIZE_AUDIT_FIELDS),
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

export async function updateSizeDetails(
  id: string,
  input: UpdateSizeInput,
  actor: ActorContext,
) {
  const existing = await getSizeById(id);

  if (input.code && input.code !== existing.code) {
    const [clash] = await findSizeByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateSize(
        id,
        { ...input, updatedBy: actor.actorUserId },
        tx,
      );
      if (!updated) throw new Error("Failed to update size");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: statusAction("size", existing, input),
          entityType: "size",
          entityId: id,
          ...diffFields(existing, updated, SIZE_AUDIT_FIELDS),
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
