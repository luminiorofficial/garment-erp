import type {
  CreateStyleInput,
  CreateStyleVersionInput,
  ListStylesQuery,
  UpdateStyleInput,
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
import { validateStyleReferences } from "./styles.references.js";
import {
  deleteStyleColors,
  deleteStyleSizes,
  findStyleByCode,
  findStyleById,
  findStyleVersion,
  insertStyle,
  insertStyleColors,
  insertStyleSizes,
  insertStyleVersion,
  listStyleColorIds,
  listStyleSizeIds,
  listStyles,
  listVersionsForStyle,
  lockStyle,
  nextVersionNumber,
  updateStyle,
} from "./styles.repository.js";

const DUPLICATE_CODE_MESSAGE = "A style with this style number already exists";
const STYLE_AUDIT_FIELDS = [
  "code",
  "name",
  "productId",
  "customerId",
  "description",
  "isActive",
] as const;

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

export function listStylesPage(query: ListStylesQuery) {
  return listStyles(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
    productId: query.productId,
    customerId: query.customerId,
  });
}

/** A style plus the ids of its allowed sizes and colors. */
export async function getStyleById(id: string) {
  const [style] = await findStyleById(id);
  if (!style) throw ApiErrors.notFound("Style");
  const [sizeIds, colorIds] = await Promise.all([
    listStyleSizeIds(id),
    listStyleColorIds(id),
  ]);
  return { ...style, sizeIds, colorIds };
}

export async function createStyle(input: CreateStyleInput, actor: ActorContext) {
  const [existing] = await findStyleByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  const { sizeIds = [], colorIds = [], ...fields } = input;

  try {
    return await db.transaction(async (tx) => {
      await validateStyleReferences(
        {
          productId: fields.productId,
          customerId: fields.customerId,
          addedSizeIds: sizeIds,
          addedColorIds: colorIds,
        },
        tx,
      );

      const [created] = await insertStyle(
        { ...fields, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
        tx,
      );
      if (!created) throw new Error("Failed to create style");

      await insertStyleSizes(created.id, sizeIds, tx);
      await insertStyleColors(created.id, colorIds, tx);

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "style.created",
          entityType: "style",
          entityId: created.id,
          newValue: {
            ...pickFields(created, STYLE_AUDIT_FIELDS),
            sizeIds: [...sizeIds].sort(),
            colorIds: [...colorIds].sort(),
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      return { ...created, sizeIds: [...sizeIds].sort(), colorIds: [...colorIds].sort() };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}

export async function updateStyleDetails(
  id: string,
  input: UpdateStyleInput,
  actor: ActorContext,
) {
  const { sizeIds, colorIds, ...fields } = input;

  if (fields.code) {
    const [clash] = await findStyleByCode(fields.code);
    if (clash && clash.id !== id) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [existing] = await lockStyle(id, tx);
      if (!existing) throw ApiErrors.notFound("Style");

      const [currentSizeIds, currentColorIds] = await Promise.all([
        listStyleSizeIds(id, tx),
        listStyleColorIds(id, tx),
      ]);

      const nextSizeIds = sizeIds ? [...sizeIds].sort() : currentSizeIds;
      const nextColorIds = colorIds ? [...colorIds].sort() : currentColorIds;

      await validateStyleReferences(
        {
          productId: fields.productId,
          customerId: fields.customerId,
          addedSizeIds: nextSizeIds.filter((s) => !currentSizeIds.includes(s)),
          addedColorIds: nextColorIds.filter((c) => !currentColorIds.includes(c)),
        },
        tx,
        existing,
      );

      const [updated] = await updateStyle(
        id,
        { ...fields, updatedBy: actor.actorUserId },
        tx,
      );
      if (!updated) throw new Error("Failed to update style");

      await deleteStyleSizes(
        id,
        currentSizeIds.filter((s) => !nextSizeIds.includes(s)),
        tx,
      );
      await insertStyleSizes(
        id,
        nextSizeIds.filter((s) => !currentSizeIds.includes(s)),
        tx,
      );
      await deleteStyleColors(
        id,
        currentColorIds.filter((c) => !nextColorIds.includes(c)),
        tx,
      );
      await insertStyleColors(
        id,
        nextColorIds.filter((c) => !currentColorIds.includes(c)),
        tx,
      );

      const changed = diffFields(existing, updated, STYLE_AUDIT_FIELDS);
      if (!sameSet(currentSizeIds, nextSizeIds)) {
        changed.oldValue.sizeIds = currentSizeIds;
        changed.newValue.sizeIds = nextSizeIds;
      }
      if (!sameSet(currentColorIds, nextColorIds)) {
        changed.oldValue.colorIds = currentColorIds;
        changed.newValue.colorIds = nextColorIds;
      }

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: statusAction("style", existing, fields),
          entityType: "style",
          entityId: id,
          ...changed,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      return { ...updated, sizeIds: nextSizeIds, colorIds: nextColorIds };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}

export async function listStyleVersions(styleId: string) {
  const [style] = await findStyleById(styleId);
  if (!style) throw ApiErrors.notFound("Style");
  return listVersionsForStyle(styleId);
}

export async function getStyleVersion(styleId: string, versionId: string) {
  const [version] = await findStyleVersion(styleId, versionId);
  if (!version) throw ApiErrors.notFound("Style version");
  return version;
}

// Versions are append-only: this is the only write path, there is no update or
// delete. The style row lock serialises numbering; the (style_id,
// version_number) unique constraint is the backstop.
export async function createStyleVersion(
  styleId: string,
  input: CreateStyleVersionInput,
  actor: ActorContext,
) {
  try {
    return await db.transaction(async (tx) => {
      const [style] = await lockStyle(styleId, tx);
      if (!style) throw ApiErrors.notFound("Style");
      if (!style.isActive)
        throw ApiErrors.validation("Cannot create a version for an inactive style");

      const versionNumber = await nextVersionNumber(styleId, tx);
      const [created] = await insertStyleVersion(
        { styleId, versionNumber, ...input, createdBy: actor.actorUserId },
        tx,
      );
      if (!created) throw new Error("Failed to create style version");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "style.version_created",
          entityType: "style_version",
          entityId: created.id,
          newValue: pickFields(created, [
            "styleId",
            "versionNumber",
            "specification",
            "changeSummary",
          ] as const),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw ApiErrors.conflict("Another version was created at the same time; retry");
    throw error;
  }
}
