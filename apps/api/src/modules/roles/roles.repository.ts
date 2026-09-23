import { and, eq, sql } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { permissions, rolePermissions, roles, userRoles } from "../../db/schema/index.js";

export async function getPermissionCodesForUser(
  userId: string
): Promise<Set<string>> {
  const rows = await db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(userRoles.userId, userId), eq(roles.isActive, true)));

  return new Set(rows.map((row) => row.code));
}

export async function getRoleCodesForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.isActive, true)));

  return rows.map((row) => row.code);
}

export function listRoles() {
  return db.select().from(roles);
}

export function findRoleById(id: string) {
  return db.select().from(roles).where(eq(roles.id, id)).limit(1);
}

export function findRoleByCode(code: string) {
  return db.select().from(roles).where(eq(roles.code, code)).limit(1);
}

type RoleRow = typeof roles.$inferSelect;

export function insertRole(
  values: typeof roles.$inferInsert,
  executor: Executor = db
): Promise<RoleRow[]> {
  return executor.insert(roles).values(values).returning();
}

export function updateRole(
  id: string,
  values: Partial<typeof roles.$inferInsert>,
  executor: Executor = db
): Promise<RoleRow[]> {
  return executor
    .update(roles)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(roles.id, id))
    .returning();
}

export function listPermissions() {
  return db.select().from(permissions);
}

export function findPermissionById(id: string) {
  return db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
}

export function listPermissionsForRole(roleId: string) {
  return db
    .select({ id: permissions.id, code: permissions.code, resource: permissions.resource, action: permissions.action })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
}

export function insertRolePermission(
  values: typeof rolePermissions.$inferInsert,
  executor: Executor = db
): Promise<unknown> {
  return executor.insert(rolePermissions).values(values).onConflictDoNothing();
}

export function deleteRolePermission(
  roleId: string,
  permissionId: string,
  executor: Executor = db
): Promise<unknown> {
  return executor
    .delete(rolePermissions)
    .where(sql`${rolePermissions.roleId} = ${roleId} and ${rolePermissions.permissionId} = ${permissionId}`);
}
