import type {
  CreateColorInput,
  ListColorsQuery,
  UpdateColorInput,
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
  findColorByCode,
  findColorById,
  insertColor,
  listColors,
  updateColor,
} from "./colors.repository.js";

const DUPLICATE_CODE_MESSAGE = "A color with this code already exists";
const COLOR_AUDIT_FIELDS = [
  "code",
  "name",
  "reference",
  "hexValue",
  "isActive",
] as const;

export function listColorsPage(query: ListColorsQuery) {
  return listColors(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
  });
}

export async function getColorById(id: string) {
  const [color] = await findColorById(id);
  if (!color) throw ApiErrors.notFound("Color");
  return color;
}

export async function createColor(input: CreateColorInput, actor: ActorContext) {
  const [existing] = await findColorByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertColor(
        { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
        tx,
      );
      if (!created) throw new Error("Failed to create color");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "color.created",
          entityType: "color",
          entityId: created.id,
          newValue: pickFields(created, COLOR_AUDIT_FIELDS),
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

export async function updateColorDetails(
  id: string,
  input: UpdateColorInput,
  actor: ActorContext,
) {
  const existing = await getColorById(id);

  if (input.code && input.code !== existing.code) {
    const [clash] = await findColorByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateColor(
        id,
        { ...input, updatedBy: actor.actorUserId },
        tx,
      );
      if (!updated) throw new Error("Failed to update color");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: statusAction("color", existing, input),
          entityType: "color",
          entityId: id,
          ...diffFields(existing, updated, COLOR_AUDIT_FIELDS),
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
