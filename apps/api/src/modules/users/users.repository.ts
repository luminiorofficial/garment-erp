import { eq, sql } from "drizzle-orm";
import { db, type Executor } from "../../db/client.js";
import { roles, userRoles, users } from "../../db/schema/index.js";

type UserRow = typeof users.$inferSelect;

export function findUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).limit(1);
}

export function findUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id)).limit(1);
}

export function listUsers(page: number, pageSize: number) {
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return row?.count ?? 0;
}

export function insertUser(
  values: typeof users.$inferInsert,
  executor: Executor = db
): Promise<UserRow[]> {
  return executor.insert(users).values(values).returning();
}

export function updateUser(
  id: string,
  values: Partial<typeof users.$inferInsert>,
  executor: Executor = db
): Promise<UserRow[]> {
  return executor
    .update(users)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
}

export function listRolesForUser(userId: string) {
  return db
    .select({ id: roles.id, code: roles.code, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
}

export function insertUserRole(
  values: typeof userRoles.$inferInsert,
  executor: Executor = db
): Promise<unknown> {
  return executor.insert(userRoles).values(values).onConflictDoNothing();
}

export function deleteUserRole(
  userId: string,
  roleId: string,
  executor: Executor = db
): Promise<unknown> {
  return executor
    .delete(userRoles)
    .where(sql`${userRoles.userId} = ${userId} and ${userRoles.roleId} = ${roleId}`);
}
