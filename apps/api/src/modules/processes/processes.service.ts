import type {
  CreateProcessInput,
  ListProcessesQuery,
  UpdateProcessInput,
} from "@garment-erp/validation";
import { db } from "../../db/client.js";
import type { ActorContext } from "../../lib/actor-context.js";
import { ApiErrors } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import {
  findProcessByCode,
  findProcessById,
  insertProcess,
  listProcesses,
  updateProcess,
} from "./processes.repository.js";

const DUPLICATE_CODE_MESSAGE = "A process with this code already exists";

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

const PROCESS_AUDIT_FIELDS = [
  "code",
  "name",
  "description",
  "isActive",
] as const;

export function listProcessesPage(query: ListProcessesQuery) {
  return listProcesses(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
  });
}

export async function getProcessById(id: string) {
  const [process] = await findProcessById(id);
  if (!process) throw ApiErrors.notFound("Process");
  return process;
}

export async function createProcess(
  input: CreateProcessInput,
  actor: ActorContext,
) {
  const [existing] = await findProcessByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertProcess(
        {
          ...input,
          createdBy: actor.actorUserId,
          updatedBy: actor.actorUserId,
        },
        tx,
      );

      if (!created) throw new Error("Failed to create process");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "process.created",
          entityType: "process",
          entityId: created.id,
          newValue: Object.fromEntries(
            PROCESS_AUDIT_FIELDS.map((field) => [field, created[field]]),
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

export async function updateProcessDetails(
  id: string,
  input: UpdateProcessInput,
  actor: ActorContext,
) {
  const existing = await getProcessById(id);

  if (input.code && input.code !== existing.code) {
    const [clash] = await findProcessByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateProcess(
        id,
        { ...input, updatedBy: actor.actorUserId },
        tx,
      );

      if (!updated) throw new Error("Failed to update process");

      const action =
        typeof input.isActive === "boolean" &&
        input.isActive !== existing.isActive
          ? input.isActive
            ? "process.activated"
            : "process.deactivated"
          : "process.updated";

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action,
          entityType: "process",
          entityId: id,
          ...diffFields(existing, updated, PROCESS_AUDIT_FIELDS),
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
