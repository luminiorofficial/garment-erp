import type {
  CreateUnitInput,
  ListUnitsQuery,
  UpdateUnitInput,
} from "@garment-erp/validation";
import { db } from "../../db/client.js";
import type { ActorContext } from "../../lib/actor-context.js";
import { ApiErrors } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import {
  findUnitByCode,
  findUnitById,
  insertUnit,
  listUnits,
  updateUnit,
} from "./units.repository.js";

const DUPLICATE_CODE_MESSAGE = "A unit with this code already exists";

// The pre-check gives a clean 409 in the common case; this catches the race
// where two requests insert the same code concurrently and the unique
// constraint is what stops the second one. Drizzle wraps the pg error, so
// check both the error and its cause.
function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  return candidates.some(
    (candidate) => (candidate as { code?: unknown } | null)?.code === "23505",
  );
}

// Returns only the fields whose values actually changed, as { old, new }
// snapshots for the audit log.
function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly (keyof T)[],
) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const field of fields) {
    if (before[field] !== after[field]) {
      oldValue[field as string] = before[field];
      newValue[field as string] = after[field];
    }
  }
  return { oldValue, newValue };
}

const UNIT_AUDIT_FIELDS = [
  "code",
  "name",
  "symbol",
  "decimalPlaces",
  "isActive",
] as const;

export function listUnitsPage(query: ListUnitsQuery) {
  return listUnits(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
  });
}

export async function getUnitById(id: string) {
  const [unit] = await findUnitById(id);
  if (!unit) throw ApiErrors.notFound("Unit");
  return unit;
}

export async function createUnit(input: CreateUnitInput, actor: ActorContext) {
  const [existing] = await findUnitByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertUnit(
        {
          ...input,
          createdBy: actor.actorUserId,
          updatedBy: actor.actorUserId,
        },
        tx,
      );

      if (!created) throw new Error("Failed to create unit");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "unit.created",
          entityType: "unit",
          entityId: created.id,
          newValue: Object.fromEntries(
            UNIT_AUDIT_FIELDS.map((field) => [field, created[field]]),
          ),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}

export async function updateUnitDetails(
  id: string,
  input: UpdateUnitInput,
  actor: ActorContext,
) {
  const existing = await getUnitById(id);

  if (input.code && input.code !== existing.code) {
    const [clash] = await findUnitByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateUnit(
        id,
        { ...input, updatedBy: actor.actorUserId },
        tx,
      );

      if (!updated) throw new Error("Failed to update unit");

      const action =
        typeof input.isActive === "boolean" &&
        input.isActive !== existing.isActive
          ? input.isActive
            ? "unit.activated"
            : "unit.deactivated"
          : "unit.updated";

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action,
          entityType: "unit",
          entityId: id,
          ...diffFields(existing, updated, UNIT_AUDIT_FIELDS),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}
