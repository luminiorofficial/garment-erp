import type { CreateRoleInput } from "@garment-erp/validation";
import { db } from "../../db/client.js";
import { ApiErrors } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import type { ActorContext } from "../../lib/actor-context.js";
import {
  deleteRolePermission,
  findPermissionById,
  findRoleByCode,
  findRoleById,
  insertRole,
  insertRolePermission,
  listPermissions,
  listPermissionsForRole,
  listRoles,
} from "./roles.repository.js";

export async function createRole(input: CreateRoleInput, actor: ActorContext) {
  const [existing] = await findRoleByCode(input.code);
  if (existing) {
    throw ApiErrors.conflict("A role with this code already exists");
  }

  return db.transaction(async (tx) => {
    const [created] = await insertRole(
      { code: input.code, name: input.name, description: input.description },
      tx
    );

    if (!created) throw new Error("Failed to create role");

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "role.created",
        entityType: "role",
        entityId: created.id,
        newValue: { code: created.code, name: created.name },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );

    return created;
  });
}

export async function getRoleById(id: string) {
  const [role] = await findRoleById(id);
  if (!role) throw ApiErrors.notFound("Role");
  return role;
}

export function listAllRoles() {
  return listRoles();
}

export function listAllPermissions() {
  return listPermissions();
}

export function getPermissionsForRole(roleId: string) {
  return listPermissionsForRole(roleId);
}

export async function assignPermissionToRole(
  roleId: string,
  permissionId: string,
  actor: ActorContext
) {
  const [role] = await findRoleById(roleId);
  if (!role) throw ApiErrors.notFound("Role");

  const [permission] = await findPermissionById(permissionId);
  if (!permission) throw ApiErrors.notFound("Permission");

  await db.transaction(async (tx) => {
    await insertRolePermission({ roleId, permissionId, createdBy: actor.actorUserId }, tx);

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "role.permission_assigned",
        entityType: "role",
        entityId: roleId,
        newValue: { permissionId, permissionCode: permission.code },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );
  });
}

export async function removePermissionFromRole(
  roleId: string,
  permissionId: string,
  actor: ActorContext
) {
  await db.transaction(async (tx) => {
    await deleteRolePermission(roleId, permissionId, tx);

    await recordAuditLog(
      {
        userId: actor.actorUserId,
        action: "role.permission_removed",
        entityType: "role",
        entityId: roleId,
        oldValue: { permissionId },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx
    );
  });
}
