/**
 * Exercises the supplier master end to end against the real database
 * (auth, RBAC gating, unique code constraint, audit logging).
 * Requires a reachable DATABASE_URL with migrations applied — see
 * infrastructure/docker/docker-compose.yml. Skips automatically (not a
 * failure) when no database is reachable, like auth.integration.test.ts.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { PermissionCode } from "@garment-erp/shared";
import { db } from "../db/client.js";
import {
  auditLogs,
  permissions,
  rolePermissions,
  roles,
  supplierContacts,
  suppliers,
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

const MANAGER_EMAIL = "integration-test-supplier-manager@example.com";
const NO_PERMISSION_EMAIL = "integration-test-supplier-noperm@example.com";
const TEST_PASSWORD = "correct horse battery staple";
const TEST_ROLE_CODE = "integration_test_supplier_role";
// Codes are unique per run so a previously aborted run can't cause false 409s.
const CODE_PREFIX = `ISUP-${Date.now()}`;

const SUPPLIER_PERMISSIONS = [
  PermissionCode.SUPPLIERS_VIEW,
  PermissionCode.SUPPLIERS_CREATE,
  PermissionCode.SUPPLIERS_EDIT,
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

interface SupplierBody {
  id: string;
  code: string;
  name: string;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  rating: number | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
}

interface ContactBody {
  id: string;
  supplierId: string;
  name: string;
  email: string | null;
  isPrimary: boolean;
}

describe.skipIf(!dbAvailable)("supplier master integration", () => {
  let managerId: string;
  let roleId: string;
  let managerCookie: string;
  let noPermissionCookie: string;
  let supplierId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);

    const [manager] = await db
      .insert(users)
      .values({ email: MANAGER_EMAIL, passwordHash, firstName: "Supplier", lastName: "Manager" })
      .returning();
    const [noPermission] = await db
      .insert(users)
      .values({ email: NO_PERMISSION_EMAIL, passwordHash, firstName: "No", lastName: "Permission" })
      .returning();
    if (!manager || !noPermission) throw new Error("Failed to create test users");
    managerId = manager.id;

    const [role] = await db
      .insert(roles)
      .values({ code: TEST_ROLE_CODE, name: "Integration Test Supplier Role" })
      .returning();
    if (!role) throw new Error("Failed to create test role");
    roleId = role.id;

    for (const code of SUPPLIER_PERMISSIONS) {
      const [resource, action] = code.split(".");
      await db
        .insert(permissions)
        .values({ code, resource: resource ?? code, action: action ?? code })
        .onConflictDoNothing({ target: permissions.code });
    }
    const permissionRows = await db
      .select()
      .from(permissions)
      .where(inArray(permissions.code, SUPPLIER_PERMISSIONS));
    for (const permission of permissionRows) {
      await db.insert(rolePermissions).values({ roleId, permissionId: permission.id });
    }
    await db.insert(userRoles).values({ userId: managerId, roleId });

    managerCookie = await login(MANAGER_EMAIL);
    noPermissionCookie = await login(NO_PERMISSION_EMAIL);
  });

  afterAll(async () => {
    const testSuppliers = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(like(suppliers.code, `${CODE_PREFIX}%`));
    const supplierIds = testSuppliers.map((row) => row.id);

    if (supplierIds.length > 0) {
      const contactIds = (
        await db
          .select({ id: supplierContacts.id })
          .from(supplierContacts)
          .where(inArray(supplierContacts.supplierId, supplierIds))
      ).map((row) => row.id);

      await db
        .delete(auditLogs)
        .where(inArray(auditLogs.entityId, [...supplierIds, ...contactIds]));
      await db.delete(supplierContacts).where(inArray(supplierContacts.supplierId, supplierIds));
      await db.delete(suppliers).where(inArray(suppliers.id, supplierIds));
    }

    await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));
    await db.delete(users).where(eq(users.email, MANAGER_EMAIL));
    await db.delete(users).where(eq(users.email, NO_PERMISSION_EMAIL));
  });

  it("returns 401 without login", async () => {
    const list = await app.request("/api/suppliers");
    expect(list.status).toBe(401);

    const create = await app.request("/api/suppliers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `${CODE_PREFIX}-X`, name: "Nope" }),
    });
    expect(create.status).toBe(401);
  });

  it("returns 403 for an authenticated user without supplier permissions", async () => {
    const list = await app.request("/api/suppliers", { headers: { cookie: noPermissionCookie } });
    expect(list.status).toBe(403);

    const create = await app.request(
      "/api/suppliers",
      jsonRequest(noPermissionCookie, "POST", { code: `${CODE_PREFIX}-X`, name: "Nope" })
    );
    expect(create.status).toBe(403);
  });

  it("does not let customer permissions grant supplier access", async () => {
    // The manager role holds only supplier permissions; the reverse check
    // lives here so a copy-paste slip in the route guards is caught.
    const res = await app.request("/api/customers", { headers: { cookie: managerCookie } });
    expect(res.status).toBe(403);
  });

  it("creates a supplier, normalizing the code and stamping createdBy", async () => {
    const res = await app.request(
      "/api/suppliers",
      jsonRequest(managerCookie, "POST", {
        code: `${CODE_PREFIX.toLowerCase()}-fabco`,
        name: "Fabco Mills",
        billingAddress: "7 Loom Street",
        paymentTerms: "Net 30",
        leadTimeDays: 14,
        rating: 4,
      })
    );
    expect(res.status).toBe(201);

    const body = (await res.json()) as SupplierBody;
    expect(body.code).toBe(`${CODE_PREFIX}-FABCO`);
    expect(body.name).toBe("Fabco Mills");
    expect(body.leadTimeDays).toBe(14);
    expect(body.rating).toBe(4);
    expect(body.isActive).toBe(true);
    expect(body.createdBy).toBe(managerId);
    supplierId = body.id;

    const get = await app.request(`/api/suppliers/${supplierId}`, {
      headers: { cookie: managerCookie },
    });
    expect(get.status).toBe(200);
  });

  it("rejects invalid rating, lead time and empty PATCH with 422", async () => {
    const badRating = await app.request(
      "/api/suppliers",
      jsonRequest(managerCookie, "POST", { code: `${CODE_PREFIX}-BAD`, name: "Bad", rating: 9 })
    );
    expect(badRating.status).toBe(422);

    const badLeadTime = await app.request(
      `/api/suppliers/${supplierId}`,
      jsonRequest(managerCookie, "PATCH", { leadTimeDays: -3 })
    );
    expect(badLeadTime.status).toBe(422);

    const empty = await app.request(
      `/api/suppliers/${supplierId}`,
      jsonRequest(managerCookie, "PATCH", {})
    );
    expect(empty.status).toBe(422);
  });

  it("returns 422 for a malformed id and 404 for an unknown one", async () => {
    const malformed = await app.request("/api/suppliers/not-a-uuid", {
      headers: { cookie: managerCookie },
    });
    expect(malformed.status).toBe(422);

    const unknown = await app.request("/api/suppliers/00000000-0000-4000-8000-000000000000", {
      headers: { cookie: managerCookie },
    });
    expect(unknown.status).toBe(404);
  });

  it("rejects a duplicate supplier code with 409", async () => {
    const res = await app.request(
      "/api/suppliers",
      jsonRequest(managerCookie, "POST", { code: `${CODE_PREFIX}-FABCO`, name: "Other Fabco" })
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CONFLICT");
  });

  it("updates a supplier", async () => {
    const res = await app.request(
      `/api/suppliers/${supplierId}`,
      jsonRequest(managerCookie, "PATCH", {
        name: "Fabco Mills Ltd",
        paymentTerms: "Net 45",
        leadTimeDays: 21,
      })
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as SupplierBody;
    expect(body.name).toBe("Fabco Mills Ltd");
    expect(body.paymentTerms).toBe("Net 45");
    expect(body.leadTimeDays).toBe(21);
    expect(body.updatedBy).toBe(managerId);
  });

  it("finds the supplier by search term", async () => {
    const res = await app.request(
      `/api/suppliers?search=${encodeURIComponent(`${CODE_PREFIX}-fab`)}`,
      { headers: { cookie: managerCookie } }
    );
    expect(res.status).toBe(200);
    const { items } = (await res.json()) as { items: SupplierBody[] };
    expect(items.map((supplier) => supplier.id)).toEqual([supplierId]);
  });

  it("creates supplier contacts, keeping only one primary", async () => {
    const first = await app.request(
      `/api/suppliers/${supplierId}/contacts`,
      jsonRequest(managerCookie, "POST", {
        name: "Anil Mehta",
        designation: "Sales Head",
        email: "Anil@Fabco.example",
        isPrimary: true,
      })
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as ContactBody;
    expect(firstBody.supplierId).toBe(supplierId);
    expect(firstBody.email).toBe("anil@fabco.example");
    expect(firstBody.isPrimary).toBe(true);

    const second = await app.request(
      `/api/suppliers/${supplierId}/contacts`,
      jsonRequest(managerCookie, "POST", { name: "Meera Iyer", isPrimary: true })
    );
    expect(second.status).toBe(201);

    const list = await app.request(`/api/suppliers/${supplierId}/contacts`, {
      headers: { cookie: managerCookie },
    });
    expect(list.status).toBe(200);
    const { items } = (await list.json()) as { items: ContactBody[] };
    expect(items).toHaveLength(2);
    expect(items.filter((contact) => contact.isPrimary).map((c) => c.name)).toEqual(["Meera Iyer"]);

    const patch = await app.request(
      `/api/suppliers/${supplierId}/contacts/${firstBody.id}`,
      jsonRequest(managerCookie, "PATCH", { designation: "Regional Sales Head" })
    );
    expect(patch.status).toBe(200);
  });

  it("deactivates a supplier via isActive", async () => {
    const res = await app.request(
      `/api/suppliers/${supplierId}`,
      jsonRequest(managerCookie, "PATCH", { isActive: false })
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as SupplierBody).isActive).toBe(false);

    const inactive = await app.request("/api/suppliers?isActive=false&pageSize=200", {
      headers: { cookie: managerCookie },
    });
    const { items } = (await inactive.json()) as { items: SupplierBody[] };
    expect(items.map((supplier) => supplier.id)).toContain(supplierId);
  });

  it("does not expose a DELETE endpoint", async () => {
    const res = await app.request(`/api/suppliers/${supplierId}`, {
      method: "DELETE",
      headers: { cookie: managerCookie },
    });
    expect(res.status).toBe(404);
  });

  it("writes audit log entries for supplier and contact changes", async () => {
    const supplierEntries = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "supplier"), eq(auditLogs.entityId, supplierId)));

    expect(supplierEntries.map((entry) => entry.action).sort()).toEqual([
      "supplier.created",
      "supplier.deactivated",
      "supplier.updated",
    ]);
    expect(supplierEntries.every((entry) => entry.userId === managerId)).toBe(true);

    const deactivated = supplierEntries.find((entry) => entry.action === "supplier.deactivated");
    expect(deactivated?.oldValue).toEqual({ isActive: true });
    expect(deactivated?.newValue).toEqual({ isActive: false });

    const contactIds = (
      await db
        .select({ id: supplierContacts.id })
        .from(supplierContacts)
        .where(eq(supplierContacts.supplierId, supplierId))
    ).map((row) => row.id);
    const contactEntries = await db
      .select()
      .from(auditLogs)
      .where(
        and(eq(auditLogs.entityType, "supplier_contact"), inArray(auditLogs.entityId, contactIds))
      );
    expect(contactEntries.map((entry) => entry.action).sort()).toEqual([
      "supplier_contact.created",
      "supplier_contact.created",
      "supplier_contact.updated",
    ]);
  });
});
