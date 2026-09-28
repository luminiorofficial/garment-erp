import type {
  CreateCustomerContactInput,
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerContactInput,
  UpdateCustomerInput,
} from "@garment-erp/validation";
import { db } from "../../db/client.js";
import type { ActorContext } from "../../lib/actor-context.js";
import { ApiErrors } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import {
  clearPrimaryContact,
  findContactById,
  findCustomerByCode,
  findCustomerById,
  insertContact,
  insertCustomer,
  listContactsForCustomer,
  listCustomers,
  updateContact,
  updateCustomer,
} from "./customers.repository.js";

const DUPLICATE_CODE_MESSAGE = "A customer with this code already exists";

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

const CUSTOMER_AUDIT_FIELDS = [
  "code",
  "name",
  "billingAddress",
  "shippingAddress",
  "paymentTerms",
  "taxInformation",
  "notes",
  "isActive",
] as const;

const CONTACT_AUDIT_FIELDS = ["name", "designation", "email", "phone", "isPrimary"] as const;

export function listCustomersPage(query: ListCustomersQuery) {
  return listCustomers(query.page, query.pageSize, {
    search: query.search,
    isActive: query.isActive,
  });
}

export async function getCustomerById(id: string) {
  const [customer] = await findCustomerById(id);
  if (!customer) throw ApiErrors.notFound("Customer");
  return customer;
}

export async function createCustomer(input: CreateCustomerInput, actor: ActorContext) {
  const [existing] = await findCustomerByCode(input.code);
  if (existing) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await insertCustomer(
        { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
        tx
      );

      if (!created) throw new Error("Failed to create customer");

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action: "customer.created",
          entityType: "customer",
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

export async function updateCustomerDetails(
  id: string,
  input: UpdateCustomerInput,
  actor: ActorContext
) {
  const existing = await getCustomerById(id);

  if (input.code && input.code !== existing.code) {
    const [clash] = await findCustomerByCode(input.code);
    if (clash) throw ApiErrors.conflict(DUPLICATE_CODE_MESSAGE);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await updateCustomer(id, { ...input, updatedBy: actor.actorUserId }, tx);

      if (!updated) throw new Error("Failed to update customer");

      const action =
        typeof input.isActive === "boolean" && input.isActive !== existing.isActive
          ? input.isActive
            ? "customer.activated"
            : "customer.deactivated"
          : "customer.updated";

      await recordAuditLog(
        {
          userId: actor.actorUserId,
          action,
          entityType: "customer",
          entityId: id,
          ...diffFields(existing, updated, CUSTOMER_AUDIT_FIELDS),
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

export async function getContactsForCustomer(customerId: string) {
  await getCustomerById(customerId);
  return listContactsForCustomer(customerId);
}

export async function createCustomerContact(
  customerId: string,
  input: CreateCustomerContactInput,
  actor: ActorContext
) {
  await getCustomerById(customerId);

  return db.transaction(async (tx) => {
    if (input.isPrimary) await clearPrimaryContact(customerId, tx);

    const [created] = await insertContact({ ...input, customerId }, tx);

    if (!created) throw new Error("Failed to create customer contact");

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "customer_contact.created",
        entityType: "customer_contact",
        entityId: created.id,
        newValue: {
          customerId,
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

export async function updateCustomerContact(
  customerId: string,
  contactId: string,
  input: UpdateCustomerContactInput,
  actor: ActorContext
) {
  const [existing] = await findContactById(customerId, contactId);
  if (!existing) throw ApiErrors.notFound("Customer contact");

  return db.transaction(async (tx) => {
    if (input.isPrimary && !existing.isPrimary) await clearPrimaryContact(customerId, tx);

    const [updated] = await updateContact(contactId, input, tx);

    if (!updated) throw new Error("Failed to update customer contact");

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "customer_contact.updated",
        entityType: "customer_contact",
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
