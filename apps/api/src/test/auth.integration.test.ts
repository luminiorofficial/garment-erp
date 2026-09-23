/**
 * Exercises the real database (login flow, RBAC gating, DB constraints).
 * Requires a reachable DATABASE_URL — see infrastructure/docker/docker-compose.yml.
 * Skips automatically (not a failure) when no database is reachable, so
 * `pnpm test` stays green in environments without Postgres.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { PermissionCode } from "@garment-erp/shared";
import { db } from "../db/client.js";
import { permissions, roles, userRoles, users } from "../db/schema/index.js";
import { hashPassword } from "../lib/password.js";
import { app } from "../app.js";

let dbAvailable = false;
try {
  await db.execute(sql`select 1`);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

const TEST_EMAIL = "integration-test-active@example.com";
const TEST_INACTIVE_EMAIL = "integration-test-inactive@example.com";
const TEST_PASSWORD = "correct horse battery staple";
const TEST_ROLE_CODE = "integration_test_role";

function extractSessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = /session=([^;]+)/.exec(setCookie);
  if (!match) throw new Error("No session cookie in response");
  return `session=${match[1]}`;
}

describe.skipIf(!dbAvailable)("auth + RBAC integration", () => {
  let activeUserId: string;
  let roleId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);

    const [active] = await db
      .insert(users)
      .values({ email: TEST_EMAIL, passwordHash, firstName: "Active", lastName: "Tester" })
      .returning();
    const [inactive] = await db
      .insert(users)
      .values({
        email: TEST_INACTIVE_EMAIL,
        passwordHash,
        firstName: "Inactive",
        lastName: "Tester",
        isActive: false,
      })
      .returning();

    if (!active || !inactive) throw new Error("Failed to create test users");
    activeUserId = active.id;

    const [role] = await db
      .insert(roles)
      .values({ code: TEST_ROLE_CODE, name: "Integration Test Role" })
      .returning();
    if (!role) throw new Error("Failed to create test role");
    roleId = role.id;

    await db
      .insert(permissions)
      .values({ code: PermissionCode.USERS_VIEW, resource: "users", action: "view" })
      .onConflictDoNothing({ target: permissions.code });
  });

  afterAll(async () => {
    await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
    await db.delete(users).where(eq(users.email, TEST_INACTIVE_EMAIL));
  });

  it("rejects login with a wrong password", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: "wrong password" }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("rejects login for an inactive user, even with the correct password", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_INACTIVE_EMAIL, password: TEST_PASSWORD }),
    });
    expect(res.status).toBe(401);
  });

  it("logs in with correct credentials and resolves /api/auth/me", async () => {
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(loginRes.status).toBe(200);
    const cookie = extractSessionCookie(loginRes);

    const meRes = await app.request("/api/auth/me", {
      headers: { cookie },
    });
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { email: string };
    expect(me.email).toBe(TEST_EMAIL);
  });

  it("rejects unauthenticated access to a protected route", async () => {
    const res = await app.request("/api/users");
    expect(res.status).toBe(401);
  });

  it("rejects an authenticated user who lacks the required permission", async () => {
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const cookie = extractSessionCookie(loginRes);

    const res = await app.request("/api/users", { headers: { cookie } });
    expect(res.status).toBe(403);
  });

  it("allows access once the required permission is granted via role assignment", async () => {
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.code, PermissionCode.USERS_VIEW))
      .limit(1);
    if (!permission) throw new Error("Permission fixture missing");

    await db.insert(userRoles).values({ userId: activeUserId, roleId });
    const { rolePermissions } = await import("../db/schema/index.js");
    await db.insert(rolePermissions).values({ roleId, permissionId: permission.id });

    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const cookie = extractSessionCookie(loginRes);

    const res = await app.request("/api/users", { headers: { cookie } });
    expect(res.status).toBe(200);
  });

  it("does not create a duplicate user_roles row for the same user+role", async () => {
    await db.insert(userRoles).values({ userId: activeUserId, roleId }).onConflictDoNothing();
    await db.insert(userRoles).values({ userId: activeUserId, roleId }).onConflictDoNothing();

    const rows = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, activeUserId));
    expect(rows.filter((r) => r.roleId === roleId)).toHaveLength(1);
  });

  it("rejects creating a second user with the same email (unique constraint)", async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);
    await expect(
      db.insert(users).values({ email: TEST_EMAIL, passwordHash, firstName: "Dup", lastName: "User" })
    ).rejects.toThrow();
  });
});
