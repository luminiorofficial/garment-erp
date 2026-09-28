import type {
  CreateJobWorkerInput,
  ListJobWorkersQuery,
  UpdateJobWorkerInput,
} from "@garment-erp/validation";
import { db } from "../../db/client.js";
import type { ActorContext } from "../../lib/actor-context.js";
import { ApiErrors } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import {
  findJobWorkerByCode,
  findJobWorkerById,
  insertJobWorker,
  listJobWorkers,
  updateJobWorker,
} from "./job-workers.repository.js";

const DUPLICATE_CODE_MESSAGE = "A job worker with this code already exists";
const CAPACITY_PAIRING_MESSAGE = "capacityPerDay and capacityUnit must be provided together";

// The pre-check gives a clean 409 in the common case; this catches the race
// where two requests insert the same code concurrently and the unique
// constraint is what stops the second one. Drizzle wraps the pg error, so
// check both the error and its cause.
function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  return candidates.some(
    (candidate) => (candidate as { code?: unknown } | null)?.code === "23505"
  );
}

// Returns only the fields whose values actually changed, as { old, new }
// snapshots for the audit log.
function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly (keyof T)[]
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

const JOB_WORKER_AUDIT_FIELDS = [
  "code",
  "name",
  "contactPerson",
  "email",
  "phone",
  "billingAddress",
  "operatingAddress",
  "process",
  "capacityPerDay",
  "capacityUnit",
  "leadTimeDays",
  "rateAgreement",
  "paymentTerms",
  "taxInformation",
  "notes",
  "isActive",
] as const;

export function listJobWorkersPage(query: ListJobWorkersQuery) {
  return listJobWorkers(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
    process: query.process,
  });
}

export async function getJobWorkerById(id: string) {
  const [jobWorker] = await findJobWorkerById(id);
  if (!jobWorker) throw ApiErrors.notFound("Job worker");
  return jobWorker;
}

export async function createJobWorker(input: CreateJobWorkerInput, actor: ActorContext) {
  const [existing] = await findJobWorkerByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertJobWorker(
        { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
        tx
      );

      if (!created) throw new Error("Failed to create job worker");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "job_worker.created",
          entityType: "job_worker",
          entityId: created.id,
          newValue: { code: created.code, name: created.name, process: created.process },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx
      );

      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}

export async function updateJobWorkerDetails(
  id: string,
  input: UpdateJobWorkerInput,
  actor: ActorContext
) {
  const existing = await getJobWorkerById(id);

  // A PATCH may send only one of capacityPerDay/capacityUnit, so the pairing
  // rule is checked against the row as it will be after the update.
  if (input.capacityPerDay !== undefined || input.capacityUnit !== undefined) {
    const capacity =
      input.capacityPerDay !== undefined ? input.capacityPerDay : existing.capacityPerDay;
    const unit = input.capacityUnit !== undefined ? input.capacityUnit : existing.capacityUnit;
    if ((capacity === null) !== (unit === null)) {
      throw ApiErrors.validation(CAPACITY_PAIRING_MESSAGE);
    }
  }

  if (input.code && input.code !== existing.code) {
    const [clash] = await findJobWorkerByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateJobWorker(id, { ...input, updatedBy: actor.actorUserId }, tx);

      if (!updated) throw new Error("Failed to update job worker");

      const action =
        typeof input.isActive === "boolean" && input.isActive !== existing.isActive
          ? input.isActive
            ? "job_worker.activated"
            : "job_worker.deactivated"
          : "job_worker.updated";

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action,
          entityType: "job_worker",
          entityId: id,
          ...diffFields(existing, updated, JOB_WORKER_AUDIT_FIELDS),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
    throw error;
  }
}
