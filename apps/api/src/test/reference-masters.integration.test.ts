/**
 * Exercises the job worker master end to end against the real database
 * (auth, RBAC gating, unique code constraint, filters, pagination, audit
 * logging). Requires a reachable DATABASE_URL with migrations applied —
 * vitest.config.ts loads apps/api/.env. Skips automatically (not a failure)
 * when no database is reachable, like auth.integration.test.ts.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, like, sql } from "drizzle-orm";
import { PermissionCode } from "@garment-erp/shared";
import { db } from "../db/client.js";
import {
  auditLogs,
  jobWorkers,
  processes,
  units,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "../db/schema/index.js";
import { hashPassword } from "../lib/password.js";
import { app } from "../app.js";
import {
  createJobWorker,
  getJobWorkerById,
  updateJobWorkerDetails,
} from "../modules/job-workers/job-workers.service.js";

let dbAvailable = false;
try {
  await db.execute(sql`select 1`);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

const MANAGER_EMAIL = "integration-test-master-manager@example.com";
const NO_PERMISSION_EMAIL = "integration-test-master-noperm@example.com";
const OTHER_PERMISSION_EMAIL = "integration-test-master-otherperm@example.com";
const TEST_EMAILS = [
  MANAGER_EMAIL,
  NO_PERMISSION_EMAIL,
  OTHER_PERMISSION_EMAIL,
];
const TEST_PASSWORD = "correct horse battery staple";
const MANAGER_ROLE_CODE = "integration_test_master_role";
const CODE_PREFIX = `IM-${Date.now()}`;
const MASTER_PERMISSIONS = [
  PermissionCode.PROCESSES_VIEW,
  PermissionCode.PROCESSES_CREATE,
  PermissionCode.PROCESSES_EDIT,
  PermissionCode.UNITS_VIEW,
  PermissionCode.UNITS_CREATE,
  PermissionCode.UNITS_EDIT,
];

function extractSessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = /session=([^;]+)/.exec(setCookie);
  if (!match) throw new Error("No session cookie in response");
  return `session=${match[1]}`;
}

async function login(email: string): Promise<string> {
  const res = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
}

function jsonRequest(
  cookie: string,
  method: string,
  body: unknown,
): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  };
}

async function createRoleWithPermissions(
  code: string,
  permissionCodes: string[],
) {
  const [role] = await db
    .insert(roles)
    .values({ code, name: `Integration Test ${code}` })
    .returning();
  if (!role) throw new Error("Failed to create test role");

  for (const permissionCode of permissionCodes) {
    const [resource, action] = permissionCode.split(".");
    await db
      .insert(permissions)
      .values({
        code: permissionCode,
        resource: resource ?? permissionCode,
        action: action ?? permissionCode,
      })
      .onConflictDoNothing({ target: permissions.code });
  }
  const permissionRows = await db
    .select()
    .from(permissions)
    .where(inArray(permissions.code, permissionCodes));
  for (const permission of permissionRows) {
    await db
      .insert(rolePermissions)
      .values({ roleId: role.id, permissionId: permission.id });
  }
  return role.id;
}

describe.skipIf(!dbAvailable)("reference masters integration", () => {
  let managerId: string;
  let roleId: string;
  let managerCookie: string;
  let noPermissionCookie: string;
  const ids: string[] = [];
  beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const rows = await db
      .insert(users)
      .values(
        TEST_EMAILS.map((email) => ({
          email,
          passwordHash,
          firstName: "Master",
          lastName: "Test",
        })),
      )
      .returning();
    managerId = rows[0]!.id;
    roleId = await createRoleWithPermissions(
      MANAGER_ROLE_CODE,
      MASTER_PERMISSIONS,
    );
    await db.insert(userRoles).values({ userId: managerId, roleId });
    managerCookie = await login(MANAGER_EMAIL);
    noPermissionCookie = await login(NO_PERMISSION_EMAIL);
  });
  afterAll(async () => {
    await db.delete(jobWorkers).where(like(jobWorkers.code, `${CODE_PREFIX}%`));
    if (ids.length)
      await db.delete(auditLogs).where(inArray(auditLogs.entityId, ids));
    await db.delete(processes).where(like(processes.code, `${CODE_PREFIX}%`));
    await db.delete(units).where(like(units.code, `${CODE_PREFIX}%`));
    if (roleId) {
      await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));
      await db.delete(roles).where(eq(roles.id, roleId));
    }
    await db.delete(users).where(inArray(users.email, TEST_EMAILS));
  });
  it("rejects missing/inactive assignments while retaining historical relationships", async () => {
    const [p] = await db
      .insert(processes)
      .values({ code: `${CODE_PREFIX}-REF`, name: "Reference" })
      .returning();
    const [u] = await db
      .insert(units)
      .values({ code: `${CODE_PREFIX}-REF`, name: "Reference" })
      .returning();
    const actor = { actorUserId: managerId };
    const input = {
      code: `${CODE_PREFIX}-JW`,
      name: "Worker",
      processId: p!.id,
      capacityUnitId: u!.id,
      capacityPerDay: 50,
    };
    for (const invalid of [
      { processId: crypto.randomUUID() },
      { capacityUnitId: crypto.randomUUID() },
    ]) {
      await expect(
        createJobWorker({ ...input, ...invalid }, actor),
      ).rejects.toMatchObject({ status: 422 });
    }
    const worker = await createJobWorker(input, actor);
    ids.push(worker.id);
    await db
      .update(processes)
      .set({ isActive: false })
      .where(eq(processes.id, p!.id));
    await db.update(units).set({ isActive: false }).where(eq(units.id, u!.id));
    await expect(getJobWorkerById(worker.id)).resolves.toMatchObject({
      processId: p!.id,
      capacityUnitId: u!.id,
    });
    await expect(
      updateJobWorkerDetails(
        worker.id,
        { name: "Historical", processId: p!.id },
        actor,
      ),
    ).resolves.toMatchObject({ name: "Historical" });
    for (const invalid of [
      { processId: p!.id },
      { capacityUnitId: u!.id, capacityPerDay: 50 },
    ]) {
      await expect(
        createJobWorker(
          { code: `${CODE_PREFIX}-NEW`, name: "New", ...invalid },
          actor,
        ),
      ).rejects.toMatchObject({ status: 422 });
    }
    await expect(
      updateJobWorkerDetails(
        worker.id,
        { processId: crypto.randomUUID() },
        actor,
      ),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      updateJobWorkerDetails(worker.id, { capacityUnitId: null }, actor),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      updateJobWorkerDetails(
        worker.id,
        { processId: null, capacityUnitId: null, capacityPerDay: null },
        actor,
      ),
    ).resolves.toMatchObject({
      processId: null,
      capacityUnitId: null,
      capacityPerDay: null,
    });
    await expect(
      updateJobWorkerDetails(worker.id, { processId: p!.id }, actor),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      updateJobWorkerDetails(
        worker.id,
        { capacityUnitId: u!.id, capacityPerDay: 5 },
        actor,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
  for (const [resource, entity] of [
    ["processes", "process"],
    ["units", "unit"],
  ]) {
    it(`${resource}: permissions, CRUD, duplicate races, search, audit and deactivation`, async () => {
      const path = `/api/${resource}`;
      const missing = crypto.randomUUID();
      for (const [method, suffix] of [
        ["GET", ""],
        ["POST", ""],
        ["GET", `/${missing}`],
        ["PATCH", `/${missing}`],
      ]) {
        expect((await app.request(path + suffix, { method })).status).toBe(401);
        expect(
          (
            await app.request(path + suffix, {
              method,
              headers: { cookie: noPermissionCookie },
            })
          ).status,
        ).toBe(403);
      }
      const input = {
        code: `${CODE_PREFIX}-${entity}`,
        name: " Test name ",
        ...(resource === "units"
          ? { symbol: `s${Date.now()}`, decimalPlaces: 3 }
          : { description: "Test description" }),
      };
      const create = await app.request(
        path,
        jsonRequest(managerCookie, "POST", input),
      );
      expect(create.status).toBe(201);
      const row = (await create.json()) as {
        id: string;
        code: string;
        name: string;
        createdBy: string;
      };
      ids.push(row.id);
      expect(row).toMatchObject({
        code: input.code.toUpperCase(),
        name: "Test name",
        createdBy: managerId,
      });
      expect(
        (await app.request(path, jsonRequest(managerCookie, "POST", input)))
          .status,
      ).toBe(409);
      expect(
        (
          await app.request(`${path}/${missing}`, {
            headers: { cookie: managerCookie },
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await app.request(`${path}/${row.id}`, {
            headers: { cookie: managerCookie },
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await app.request(
            `${path}/${row.id}`,
            jsonRequest(managerCookie, "PATCH", {}),
          )
        ).status,
      ).toBe(422);
      for (const patch of [
        { name: "Edited" },
        { isActive: false },
        { isActive: true },
      ])
        expect(
          (
            await app.request(
              `${path}/${row.id}`,
              jsonRequest(managerCookie, "PATCH", patch),
            )
          ).status,
        ).toBe(200);
      expect(
        (
          await app.request(`${path}/${row.id}`, {
            method: "DELETE",
            headers: { cookie: managerCookie },
          })
        ).status,
      ).toBe(404);
      const query = await app.request(
        `${path}?search=${input.code}&isActive=true&pageSize=1`,
        { headers: { cookie: managerCookie } },
      );
      expect(await query.json()).toMatchObject({
        items: [{ id: row.id }],
        page: 1,
        pageSize: 1,
      });
      const hidden = await app.request(
        `${path}?search=${input.code}&isActive=false`,
        { headers: { cookie: managerCookie } },
      );
      expect(await hidden.json()).toMatchObject({ items: [] });
      if ("symbol" in input) {
        const bySymbol = await app.request(`${path}?search=${input.symbol}`, {
          headers: { cookie: managerCookie },
        });
        expect(await bySymbol.json()).toMatchObject({
          items: [{ id: row.id, decimalPlaces: 3 }],
        });
      }
      const audits = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, row.id));
      expect(audits.map((a) => a.action).sort()).toEqual([
        `${entity}.activated`,
        `${entity}.created`,
        `${entity}.deactivated`,
        `${entity}.updated`,
      ]);
      expect(audits.every((a) => a.userId === managerId)).toBe(true);
      expect(
        audits.find((a) => a.action.endsWith(".deactivated")),
      ).toMatchObject({
        oldValue: { isActive: true },
        newValue: { isActive: false },
      });
      const raceInput = { ...input, code: `${input.code}-RACE` };
      const race = await Promise.all(
        [1, 2].map(() =>
          app.request(path, jsonRequest(managerCookie, "POST", raceInput)),
        ),
      );
      expect(race.map((r) => r.status).sort()).toEqual([201, 409]);
      for (const response of race)
        if (response.status === 201)
          ids.push(((await response.json()) as { id: string }).id);
    });
  }
});
