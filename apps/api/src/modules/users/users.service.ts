import type { CreateUserInput, UpdateUserInput } from "@garment-erp/validation";
import { db } from "../../db/client.js";
import type { ActorContext } from "../../lib/actor-context.js";
import { recordAuditLog } from "../../lib/audit.js";
import { ApiErrors } from "../../lib/api-error.js";
import { normalizeEmail } from "../../lib/normalize-email.js";
import { hashPassword } from "../../lib/password.js";
import { findRoleById } from "../roles/roles.repository.js";
import {
  deleteUserRole,
  findUserByEmail,
  findUserById,
  insertUser,
  insertUserRole,
  listRolesForUser,
  listUsers,
  updateUser,
} from "./users.repository.js";

function toSafeUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  const { id, email, firstName, lastName, phone, isActive, lastLoginAt, createdAt } = user;
  return { id, email, firstName, lastName, phone, isActive, lastLoginAt, createdAt };
}

export async function createUser(input: CreateUserInput, actor: ActorContext) {
  const email = normalizeEmail(input.email);
  const [existing] = await findUserByEmail(email);
  if (existing) {
    throw ApiErrors.conflict("A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const [created] = await insertUser(
      {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        createdBy: actor.actorUserId,
        updatedBy: actor.actorUserId,
      },
      tx
    );

    if (!created) {
      throw new Error("Failed to create user");
    }

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "user.created",
        entityType: "user",
        entityId: created.id,
        newValue: { email: created.email, firstName: created.firstName, lastName: created.lastName },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );

    return toSafeUser(created);
  });
}

export async function getUserById(id: string) {
  const [user] = await findUserById(id);
  if (!user) {
    throw ApiErrors.notFound("User");
  }
  return toSafeUser(user);
}

export async function listUsersPage(page: number, pageSize: number) {
  return listUsers(page, pageSize);
}

export async function updateUserProfile(
  id: string,
  input: UpdateUserInput,
  actor: ActorContext
) {
  const [existing] = await findUserById(id);
  if (!existing) {
    throw ApiErrors.notFound("User");
  }

  return db.transaction(async (tx) => {
    const [updated] = await updateUser(
      id,
      { ...input, updatedBy: actor.actorUserId },
      tx
    );

    if (!updated) {
      throw new Error("Failed to update user");
    }

    const action =
      typeof input.isActive === "boolean" && input.isActive !== existing.isActive
        ? input.isActive
          ? "user.activated"
          : "user.deactivated"
        : "user.updated";

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action,
        entityType: "user",
        entityId: id,
        oldValue: { isActive: existing.isActive },
        newValue: { isActive: updated.isActive },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );

    return toSafeUser(updated);
  });
}

export async function getRolesForUser(userId: string) {
  return listRolesForUser(userId);
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
  actor: ActorContext
) {
  const [user] = await findUserById(userId);
  if (!user) throw ApiErrors.notFound("User");

  const [role] = await findRoleById(roleId);
  if (!role) throw ApiErrors.notFound("Role");

  await db.transaction(async (tx) => {
    await insertUserRole(
      { userId, roleId, createdBy: actor.actorUserId },
      tx
    );

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "user.role_assigned",
        entityType: "user",
        entityId: userId,
        newValue: { roleId, roleCode: role.code },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );
  });
}

export async function removeRoleFromUser(
  userId: string,
  roleId: string,
  actor: ActorContext
) {
  await db.transaction(async (tx) => {
    await deleteUserRole(userId, roleId, tx);

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "user.role_removed",
        entityType: "user",
        entityId: userId,
        oldValue: { roleId },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );
  });
}
