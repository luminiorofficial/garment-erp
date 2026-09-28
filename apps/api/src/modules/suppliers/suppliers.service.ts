import type {
  CreateSupplierContactInput,
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierContactInput,
  UpdateSupplierInput,
} from "@garment-erp/validation";
import { db } from "../../db/client.js";
import type { ActorContext } from "../../lib/actor-context.js";
import { ApiErrors } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import {
  clearPrimaryContact,
  findContactById,
  findSupplierByCode,
  findSupplierById,
  insertContact,
  insertSupplier,
  listContactsForSupplier,
  listSuppliers,
  updateContact,
  updateSupplier,
} from "./suppliers.repository.js";

const DUPLICATE_CODE_MESSAGE = "A supplier with this code already exists";

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

const SUPPLIER_AUDIT_FIELDS = [
  "code",
  "name",
  "billingAddress",
  "shippingAddress",
  "paymentTerms",
  "leadTimeDays",
  "rating",
  "taxInformation",
  "notes",
  "isActive",
] as const;

const CONTACT_AUDIT_FIELDS = ["name", "designation", "email", "phone", "isPrimary"] as const;

export function listSuppliersPage(query: ListSuppliersQuery) {
  return listSuppliers(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
  });
}

export async function getSupplierById(id: string) {
  const [supplier] = await findSupplierById(id);
  if (!supplier) throw ApiErrors.notFound("Supplier");
  return supplier;
}

export async function createSupplier(input: CreateSupplierInput, actor: ActorContext) {
  const [existing] = await findSupplierByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertSupplier(
        { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
        tx
      );

      if (!created) throw new Error("Failed to create supplier");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "supplier.created",
          entityType: "supplier",
          entityId: created.id,
          newValue: { code: created.code, name: created.name },
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

export async function updateSupplierDetails(
  id: string,
  input: UpdateSupplierInput,
  actor: ActorContext
) {
  const existing = await getSupplierById(id);

  if (input.code && input.code !== existing.code) {
    const [clash] = await findSupplierByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateSupplier(id, { ...input, updatedBy: actor.actorUserId }, tx);

      if (!updated) throw new Error("Failed to update supplier");

      const action =
        typeof input.isActive === "boolean" && input.isActive !== existing.isActive
          ? input.isActive
            ? "supplier.activated"
            : "supplier.deactivated"
          : "supplier.updated";

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action,
          entityType: "supplier",
          entityId: id,
          ...diffFields(existing, updated, SUPPLIER_AUDIT_FIELDS),
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

export async function getContactsForSupplier(supplierId: string) {
  await getSupplierById(supplierId);
  return listContactsForSupplier(supplierId);
}

export async function createSupplierContact(
  supplierId: string,
  input: CreateSupplierContactInput,
  actor: ActorContext
) {
  await getSupplierById(supplierId);

  return db.transaction(async (tx) => {
    if (input.isPrimary) await clearPrimaryContact(supplierId, tx);

    const [created] = await insertContact({ ...input, supplierId }, tx);

    if (!created) throw new Error("Failed to create supplier contact");

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "supplier_contact.created",
        entityType: "supplier_contact",
        entityId: created.id,
        newValue: {
          supplierId,
          name: created.name,
          email: created.email,
          isPrimary: created.isPrimary,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );

    return created;
  });
}

export async function updateSupplierContact(
  supplierId: string,
  contactId: string,
  input: UpdateSupplierContactInput,
  actor: ActorContext
) {
  const [existing] = await findContactById(supplierId, contactId);
  if (!existing) throw ApiErrors.notFound("Supplier contact");

  return db.transaction(async (tx) => {
    if (input.isPrimary && !existing.isPrimary) await clearPrimaryContact(supplierId, tx);

    const [updated] = await updateContact(contactId, input, tx);

    if (!updated) throw new Error("Failed to update supplier contact");

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "supplier_contact.updated",
        entityType: "supplier_contact",
        entityId: contactId,
        ...diffFields(existing, updated, CONTACT_AUDIT_FIELDS),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );

    return updated;
  });
}
