/**
 * Exercises the job worker master end to end against the real database
 * (auth, RBAC gating, unique code constraint, filters, pagination, audit
 * logging). Requires a reachable DATABASE_URL with migrations applied —
 * vitest.config.ts loads apps/api/.env. Skips automatically (not a failure)
 * when no database is reachable, like auth.integration.test.ts.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { PermissionCode } from "@garment-erp/shared";
import { db } from "../db/client.js";
import {
  auditLogs,
  jobWorkers,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "../db/schema/index.js";
import { hashPassword } from "../lib/password.js";
import { app } from "../app.js";

let dbAvailable = false;
try {
  await db.execute(sql`select 1`);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

const MANAGER_EMAIL = "integration-test-jobworker-manager@example.com";
const NO_PERMISSION_EMAIL = "integration-test-jobworker-noperm@example.com";
const OTHER_PERMISSION_EMAIL = "integration-test-jobworker-otherperm@example.com";
const TEST_EMAILS = [MANAGER_EMAIL, NO_PERMISSION_EMAIL, OTHER_PERMISSION_EMAIL];
const TEST_PASSWORD = "correct horse battery staple";
const MANAGER_ROLE_CODE = "integration_test_jobworker_role";
const OTHER_ROLE_CODE = "integration_test_jobworker_other_role";
// Codes (and the process name used for filtering) are unique per run so a
// previously aborted run can't cause false 409s or extra filter matches.
const RUN_ID = Date.now();
const CODE_PREFIX = `IJW-${RUN_ID}`;
const PROCESS = `ITEST${RUN_ID}`;
const OTHER_PROCESS = `ITESTX${RUN_ID}`;

const JOB_WORKER_PERMISSIONS = [
  PermissionCode.JOB_WORKERS_VIEW,
  PermissionCode.JOB_WORKERS_CREATE,
  PermissionCode.JOB_WORKERS_EDIT,
];
// Everything that is *not* a job worker permission but sounds adjacent.
const UNRELATED_PERMISSIONS = [
  PermissionCode.SUPPLIERS_VIEW,
  PermissionCode.SUPPLIERS_CREATE,
  PermissionCode.SUPPLIERS_EDIT,
  PermissionCode.CUSTOMERS_VIEW,
  PermissionCode.CUSTOMERS_CREATE,
  PermissionCode.CUSTOMERS_EDIT,
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

function jsonRequest(cookie: string, method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  };
}

async function createRoleWithPermissions(code: string, permissionCodes: string[]) {
  const [role] = await db
    .insert(roles)
    .values({ code, name: `Integration Test ${code}` })
    .returning();
  if (!role) throw new Error("Failed to create test role");

  for (const permissionCode of permissionCodes) {
    const [resource, action] = permissionCode.split(".");
    await db
      .insert(permissions)
      .values({ code: permissionCode, resource: resource ?? permissionCode, action: action ?? permissionCode })
      .onConflictDoNothing({ target: permissions.code });
  }
  const permissionRows = await db
    .select()
    .from(permissions)
    .where(inArray(permissions.code, permissionCodes));
  for (const permission of permissionRows) {
    await db.insert(rolePermissions).values({ roleId: role.id, permissionId: permission.id });
  }
  return role.id;
}

interface JobWorkerBody {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  process: string | null;
  capacityPerDay: number | null;
  capacityUnit: string | null;
  leadTimeDays: number | null;
  rateAgreement: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
}

interface PageBody {
  items: JobWorkerBody[];
  page: number;
  pageSize: number;
}

describe.skipIf(!dbAvailable)("job worker master integration", () => {
  let managerId: string;
  let roleIds: string[] = [];
  let managerCookie: string;
  let noPermissionCookie: string;
  let otherPermissionCookie: string;
  let jobWorkerId: string;

  async function createJobWorker(body: Record<string, unknown>): Promise<JobWorkerBody> {
    const res = await app.request("/api/job-workers", jsonRequest(managerCookie, "POST", body));
    expect(res.status).toBe(201);
    return (await res.json()) as JobWorkerBody;
  }

  async function list(query: string): Promise<PageBody> {
    const res = await app.request(`/api/job-workers?${query}`, {
      headers: { cookie: managerCookie },
    });
    expect(res.status).toBe(200);
    return (await res.json()) as PageBody;
  }

  beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);

    const [manager, noPermission, otherPermission] = await db
      .insert(users)
      .values([
        { email: MANAGER_EMAIL, passwordHash, firstName: "JobWorker", lastName: "Manager" },
        { email: NO_PERMISSION_EMAIL, passwordHash, firstName: "No", lastName: "Permission" },
        { email: OTHER_PERMISSION_EMAIL, passwordHash, firstName: "Other", lastName: "Permission" },
      ])
      .returning();
    if (!manager || !noPermission || !otherPermission) throw new Error("Failed to create test users");
    managerId = manager.id;

    const managerRoleId = await createRoleWithPermissions(MANAGER_ROLE_CODE, JOB_WORKER_PERMISSIONS);
    const otherRoleId = await createRoleWithPermissions(OTHER_ROLE_CODE, UNRELATED_PERMISSIONS);
    roleIds = [managerRoleId, otherRoleId];
    await db.insert(userRoles).values([
      { userId: managerId, roleId: managerRoleId },
      { userId: otherPermission.id, roleId: otherRoleId },
    ]);

    managerCookie = await login(MANAGER_EMAIL);
    noPermissionCookie = await login(NO_PERMISSION_EMAIL);
    otherPermissionCookie = await login(OTHER_PERMISSION_EMAIL);
  });

  afterAll(async () => {
    const testJobWorkerIds = (
      await db
        .select({ id: jobWorkers.id })
        .from(jobWorkers)
        .where(like(jobWorkers.code, `${CODE_PREFIX}%`))
    ).map((row) => row.id);

    if (testJobWorkerIds.length > 0) {
      await db.delete(auditLogs).where(inArray(auditLogs.entityId, testJobWorkerIds));
      await db.delete(jobWorkers).where(inArray(jobWorkers.id, testJobWorkerIds));
    }

    if (roleIds.length > 0) {
      await db.delete(userRoles).where(inArray(userRoles.roleId, roleIds));
      await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, roleIds));
      await db.delete(roles).where(inArray(roles.id, roleIds));
    }
    await db.delete(users).where(inArray(users.email, TEST_EMAILS));
  });

  it("returns 401 without login", async () => {
    const listRes = await app.request("/api/job-workers");
    expect(listRes.status).toBe(401);

    const create = await app.request("/api/job-workers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `${CODE_PREFIX}-X`, name: "Nope" }),
    });
    expect(create.status).toBe(401);
  });

  it("returns 403 for an authenticated user without job worker permissions", async () => {
    const listRes = await app.request("/api/job-workers", {
      headers: { cookie: noPermissionCookie },
    });
    expect(listRes.status).toBe(403);

    const create = await app.request(
      "/api/job-workers",
      jsonRequest(noPermissionCookie, "POST", { code: `${CODE_PREFIX}-X`, name: "Nope" })
    );
    expect(create.status).toBe(403);
  });

  it("does not let supplier/customer permissions grant job worker access", async () => {
    const listRes = await app.request("/api/job-workers", {
      headers: { cookie: otherPermissionCookie },
    });
    expect(listRes.status).toBe(403);

    const create = await app.request(
      "/api/job-workers",
      jsonRequest(otherPermissionCookie, "POST", { code: `${CODE_PREFIX}-X`, name: "Nope" })
    );
    expect(create.status).toBe(403);

    // And the reverse: job worker permissions don't open the other masters.
    const suppliersRes = await app.request("/api/suppliers", { headers: { cookie: managerCookie } });
    expect(suppliersRes.status).toBe(403);
  });

  it("creates a job worker, normalizing code/process/email and stamping createdBy", async () => {
    const body = await createJobWorker({
      code: `${CODE_PREFIX.toLowerCase()}-stw`,
      name: "Stitchwell Works",
      contactPerson: "Ravi Kumar",
      email: "Ravi@Stitchwell.Example",
      process: PROCESS.toLowerCase(),
      capacityPerDay: 1200,
      capacityUnit: "pcs",
      leadTimeDays: 7,
      rateAgreement: "₹18 / piece stitching",
    });

    expect(body.code).toBe(`${CODE_PREFIX}-STW`);
    expect(body.name).toBe("Stitchwell Works");
    expect(body.email).toBe("ravi@stitchwell.example");
    expect(body.process).toBe(PROCESS);
    expect(body.capacityPerDay).toBe(1200);
    expect(body.capacityUnit).toBe("PCS");
    expect(body.leadTimeDays).toBe(7);
    expect(body.rateAgreement).toBe("₹18 / piece stitching");
    expect(body.isActive).toBe(true);
    expect(body.createdBy).toBe(managerId);
    expect(body.updatedBy).toBe(managerId);
    jobWorkerId = body.id;
  });

  it("gets a job worker by id", async () => {
    const res = await app.request(`/api/job-workers/${jobWorkerId}`, {
      headers: { cookie: managerCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as JobWorkerBody;
    expect(body.id).toBe(jobWorkerId);
    expect(body.code).toBe(`${CODE_PREFIX}-STW`);
  });

  it("returns 422 for a malformed id and 404 for an unknown one", async () => {
    const malformed = await app.request("/api/job-workers/not-a-uuid", {
      headers: { cookie: managerCookie },
    });
    expect(malformed.status).toBe(422);

    const unknown = await app.request("/api/job-workers/00000000-0000-4000-8000-000000000000", {
      headers: { cookie: managerCookie },
    });
    expect(unknown.status).toBe(404);

    const unknownPatch = await app.request(
      "/api/job-workers/00000000-0000-4000-8000-000000000000",
      jsonRequest(managerCookie, "PATCH", { name: "X" })
    );
    expect(unknownPatch.status).toBe(404);
  });

  it("rejects a duplicate code (in any casing) with 409", async () => {
    const res = await app.request(
      "/api/job-workers",
      jsonRequest(managerCookie, "POST", { code: `${CODE_PREFIX.toLowerCase()}-stw`, name: "Other" })
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CONFLICT");
  });

  it("rejects negative capacity, negative lead time, unpaired capacity and empty PATCH with 422", async () => {
    const cases: [string, string, unknown][] = [
      ["POST", "/api/job-workers", { code: `${CODE_PREFIX}-BAD`, name: "Bad", capacityPerDay: -10, capacityUnit: "PCS" }],
      ["POST", "/api/job-workers", { code: `${CODE_PREFIX}-BAD`, name: "Bad", leadTimeDays: -1 }],
      ["POST", "/api/job-workers", { code: `${CODE_PREFIX}-BAD`, name: "Bad", capacityPerDay: 100 }],
      ["PATCH", `/api/job-workers/${jobWorkerId}`, { capacityPerDay: -10 }],
      ["PATCH", `/api/job-workers/${jobWorkerId}`, { leadTimeDays: -3 }],
      ["PATCH", `/api/job-workers/${jobWorkerId}`, { capacityUnit: null }],
      ["PATCH", `/api/job-workers/${jobWorkerId}`, {}],
    ];
    for (const [method, path, body] of cases) {
      const res = await app.request(path, jsonRequest(managerCookie, method, body));
      expect(res.status, `${method} ${JSON.stringify(body)}`).toBe(422);
      const errorBody = (await res.json()) as { error: { code: string } };
      expect(errorBody.error.code).toBe("VALIDATION_ERROR");
    }

    const [stored] = await db.select().from(jobWorkers).where(eq(jobWorkers.id, jobWorkerId));
    expect(stored?.capacityPerDay).toBe(1200);
    expect(stored?.capacityUnit).toBe("PCS");
    expect(stored?.leadTimeDays).toBe(7);
  });

  it("updates a job worker and audits it as job_worker.updated", async () => {
    const res = await app.request(
      `/api/job-workers/${jobWorkerId}`,
      jsonRequest(managerCookie, "PATCH", {
        name: "Stitchwell Works Pvt Ltd",
        capacityPerDay: 1500,
        leadTimeDays: 10,
        paymentTerms: "Net 15",
      })
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as JobWorkerBody;
    expect(body.name).toBe("Stitchwell Works Pvt Ltd");
    expect(body.capacityPerDay).toBe(1500);
    expect(body.capacityUnit).toBe("PCS");
    expect(body.leadTimeDays).toBe(10);
    expect(body.updatedBy).toBe(managerId);

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, "job_worker"),
          eq(auditLogs.entityId, jobWorkerId),
          eq(auditLogs.action, "job_worker.updated")
        )
      );
    expect(entry?.userId).toBe(managerId);
    expect(entry?.oldValue).toEqual({
      name: "Stitchwell Works",
      capacityPerDay: 1200,
      leadTimeDays: 7,
      paymentTerms: null,
    });
    expect(entry?.newValue).toEqual({
      name: "Stitchwell Works Pvt Ltd",
      capacityPerDay: 1500,
      leadTimeDays: 10,
      paymentTerms: "Net 15",
    });
  });

  it("finds job workers by code, name and contact person", async () => {
    const byCode = await list(`search=${encodeURIComponent(`${CODE_PREFIX}-st`)}`);
    expect(byCode.items.map((jw) => jw.id)).toEqual([jobWorkerId]);

    const byName = await list(
      `search=${encodeURIComponent("stitchwell works pvt")}&process=${PROCESS}`
    );
    expect(byName.items.map((jw) => jw.id)).toEqual([jobWorkerId]);

    const byContact = await list(`search=${encodeURIComponent("ravi kumar")}&process=${PROCESS}`);
    expect(byContact.items.map((jw) => jw.id)).toEqual([jobWorkerId]);
  });

  it("filters by process (case-insensitively normalized)", async () => {
    const embroiderer = await createJobWorker({
      code: `${CODE_PREFIX}-EMB`,
      name: "Threadart Embroidery",
      process: OTHER_PROCESS,
    });

    const main = await list(`process=${PROCESS.toLowerCase()}&pageSize=200`);
    expect(main.items.map((jw) => jw.id)).toEqual([jobWorkerId]);

    const other = await list(`process=${OTHER_PROCESS}&pageSize=200`);
    expect(other.items.map((jw) => jw.id)).toEqual([embroiderer.id]);
  });

  it("filters by active and inactive status", async () => {
    const dormant = await createJobWorker({
      code: `${CODE_PREFIX}-DRM`,
      name: "Dormant Washers",
      process: PROCESS,
    });
    const deactivate = await app.request(
      `/api/job-workers/${dormant.id}`,
      jsonRequest(managerCookie, "PATCH", { isActive: false })
    );
    expect(deactivate.status).toBe(200);

    const active = await list(`process=${PROCESS}&isActive=true&pageSize=200`);
    expect(active.items.map((jw) => jw.id)).toEqual([jobWorkerId]);
    expect(active.items.every((jw) => jw.isActive)).toBe(true);

    const inactive = await list(`process=${PROCESS}&isActive=false&pageSize=200`);
    expect(inactive.items.map((jw) => jw.id)).toEqual([dormant.id]);
    expect(inactive.items.every((jw) => !jw.isActive)).toBe(true);

    const all = await list(`process=${PROCESS}&pageSize=200`);
    expect(all.items.map((jw) => jw.id).sort()).toEqual([jobWorkerId, dormant.id].sort());
  });

  it("paginates the job worker list with page and pageSize", async () => {
    const pagePrefix = `${CODE_PREFIX}-PG`;
    const createdIds: string[] = [];
    for (const suffix of ["A", "B", "C"]) {
      const created = await createJobWorker({
        code: `${pagePrefix}-${suffix}`,
        name: `Pagination Job Worker ${suffix}`,
      });
      createdIds.push(created.id);
    }

    // Scoped to this test's rows so the expected order is exact (the list is
    // ordered by code ascending).
    const scope = `search=${encodeURIComponent(pagePrefix)}`;
    const page1 = await list(`${scope}&page=1&pageSize=1`);
    const page2 = await list(`${scope}&page=2&pageSize=1`);
    const page3 = await list(`${scope}&page=3&pageSize=1`);
    const page4 = await list(`${scope}&page=4&pageSize=1`);

    expect(Object.keys(page1).sort()).toEqual(["items", "page", "pageSize"]);
    expect([page1.page, page1.pageSize]).toEqual([1, 1]);
    expect([page2.page, page2.pageSize]).toEqual([2, 1]);

    expect(page1.items.map((jw) => jw.id)).toEqual([createdIds[0]]);
    expect(page2.items.map((jw) => jw.id)).toEqual([createdIds[1]]);
    expect(page3.items.map((jw) => jw.id)).toEqual([createdIds[2]]);
    expect(page4.items).toEqual([]);

    // Unfiltered too: at least these rows exist, so pages 1 and 2 must differ.
    const unscoped1 = await list("page=1&pageSize=1");
    const unscoped2 = await list("page=2&pageSize=1");
    expect(unscoped1.items).toHaveLength(1);
    expect(unscoped2.items).toHaveLength(1);
    expect(unscoped1.items[0]?.id).not.toBe(unscoped2.items[0]?.id);
  });

  it("deactivates and then reactivates a job worker via isActive", async () => {
    const deactivate = await app.request(
      `/api/job-workers/${jobWorkerId}`,
      jsonRequest(managerCookie, "PATCH", { isActive: false })
    );
    expect(deactivate.status).toBe(200);
    expect(((await deactivate.json()) as JobWorkerBody).isActive).toBe(false);

    const [afterDeactivate] = await db
      .select()
      .from(jobWorkers)
      .where(eq(jobWorkers.id, jobWorkerId));
    expect(afterDeactivate?.isActive).toBe(false);

    const reactivate = await app.request(
      `/api/job-workers/${jobWorkerId}`,
      jsonRequest(managerCookie, "PATCH", { isActive: true })
    );
    expect(reactivate.status).toBe(200);
    const reactivated = (await reactivate.json()) as JobWorkerBody;
    expect(reactivated.isActive).toBe(true);
    expect(reactivated.updatedBy).toBe(managerId);

    const [afterReactivate] = await db
      .select()
      .from(jobWorkers)
      .where(eq(jobWorkers.id, jobWorkerId));
    expect(afterReactivate?.isActive).toBe(true);
  });

  it("does not expose a DELETE endpoint", async () => {
    const res = await app.request(`/api/job-workers/${jobWorkerId}`, {
      method: "DELETE",
      headers: { cookie: managerCookie },
    });
    expect(res.status).toBe(404);

    const [stillThere] = await db.select().from(jobWorkers).where(eq(jobWorkers.id, jobWorkerId));
    expect(stillThere).toBeDefined();
  });

  it("writes created/updated/deactivated/activated audit entries", async () => {
    const entries = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "job_worker"), eq(auditLogs.entityId, jobWorkerId)));

    expect(entries.map((entry) => entry.action).sort()).toEqual([
      "job_worker.activated",
      "job_worker.created",
      "job_worker.deactivated",
      "job_worker.updated",
    ]);
    expect(entries.every((entry) => entry.userId === managerId)).toBe(true);

    const created = entries.find((entry) => entry.action === "job_worker.created");
    expect(created?.newValue).toEqual({
      code: `${CODE_PREFIX}-STW`,
      name: "Stitchwell Works",
      process: PROCESS,
    });

    const deactivated = entries.find((entry) => entry.action === "job_worker.deactivated");
    expect(deactivated?.oldValue).toEqual({ isActive: true });
    expect(deactivated?.newValue).toEqual({ isActive: false });

    const activated = entries.find((entry) => entry.action === "job_worker.activated");
    expect(activated?.oldValue).toEqual({ isActive: false });
    expect(activated?.newValue).toEqual({ isActive: true });
  });
});
