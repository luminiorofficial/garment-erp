/**
 * Exercises the customer master end to end against the real database
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
  customerContacts,
  customers,
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

const MANAGER_EMAIL = "integration-test-customer-manager@example.com";
const NO_PERMISSION_EMAIL = "integration-test-customer-noperm@example.com";
const TEST_PASSWORD = "correct horse battery staple";
const TEST_ROLE_CODE = "integration_test_customer_role";
// Codes are unique per run so a previously aborted run can't cause false 409s.
const CODE_PREFIX = `ITEST-${Date.now()}`;

const CUSTOMER_PERMISSIONS = [
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

interface CustomerBody {
  id: string;
  code: string;
  name: string;
  paymentTerms: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
}

interface ContactBody {
  id: string;
  customerId: string;
  name: string;
  isPrimary: boolean;
}

describe.skipIf(!dbAvailable)("customer master integration", () => {
  let managerId: string;
  let roleId: string;
  let managerCookie: string;
  let noPermissionCookie: string;
  let customerId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);

    const [manager] = await db
      .insert(users)
      .values({ email: MANAGER_EMAIL, passwordHash, firstName: "Customer", lastName: "Manager" })
      .returning();
    const [noPermission] = await db
      .insert(users)
      .values({ email: NO_PERMISSION_EMAIL, passwordHash, firstName: "No", lastName: "Permission" })
      .returning();
    if (!manager || !noPermission) throw new Error("Failed to create test users");
    managerId = manager.id;

    const [role] = await db
      .insert(roles)
      .values({ code: TEST_ROLE_CODE, name: "Integration Test Customer Role" })
      .returning();
    if (!role) throw new Error("Failed to create test role");
    roleId = role.id;

    for (const code of CUSTOMER_PERMISSIONS) {
      const [resource, action] = code.split(".");
      await db
        .insert(permissions)
        .values({ code, resource: resource ?? code, action: action ?? code })
        .onConflictDoNothing({ target: permissions.code });
    }
    const permissionRows = await db
      .select()
      .from(permissions)
      .where(inArray(permissions.code, CUSTOMER_PERMISSIONS));
    for (const permission of permissionRows) {
      await db.insert(rolePermissions).values({ roleId, permissionId: permission.id });
    }
    await db.insert(userRoles).values({ userId: managerId, roleId });

    managerCookie = await login(MANAGER_EMAIL);
    noPermissionCookie = await login(NO_PERMISSION_EMAIL);
  });

  afterAll(async () => {
    const testCustomers = await db
      .select({ id: customers.id })
      .from(customers)
      .where(like(customers.code, `${CODE_PREFIX}%`));
    const customerIds = testCustomers.map((row) => row.id);

    if (customerIds.length > 0) {
      const contactIds = (
        await db
          .select({ id: customerContacts.id })
          .from(customerContacts)
          .where(inArray(customerContacts.customerId, customerIds))
      ).map((row) => row.id);

      await db
        .delete(auditLogs)
        .where(inArray(auditLogs.entityId, [...customerIds, ...contactIds]));
      await db.delete(customerContacts).where(inArray(customerContacts.customerId, customerIds));
      await db.delete(customers).where(inArray(customers.id, customerIds));
    }

    await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));
    await db.delete(users).where(eq(users.email, MANAGER_EMAIL));
    await db.delete(users).where(eq(users.email, NO_PERMISSION_EMAIL));
  });

  it("returns 401 without login", async () => {
    const list = await app.request("/api/customers");
    expect(list.status).toBe(401);

    const create = await app.request("/api/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `${CODE_PREFIX}-X`, name: "Nope" }),
    });
    expect(create.status).toBe(401);
  });

  it("returns 403 for an authenticated user without customer permissions", async () => {
    const list = await app.request("/api/customers", { headers: { cookie: noPermissionCookie } });
    expect(list.status).toBe(403);

    const create = await app.request(
      "/api/customers",
      jsonRequest(noPermissionCookie, "POST", { code: `${CODE_PREFIX}-X`, name: "Nope" })
    );
    expect(create.status).toBe(403);
  });

  it("creates a customer, normalizing the code and stamping createdBy", async () => {
    const res = await app.request(
      "/api/customers",
      jsonRequest(managerCookie, "POST", {
        code: `${CODE_PREFIX.toLowerCase()}-acme`,
        name: "Acme Apparel",
        billingAddress: "1 Mill Road",
        paymentTerms: "Net 30",
      })
    );
    expect(res.status).toBe(201);

    const body = (await res.json()) as CustomerBody;
    expect(body.code).toBe(`${CODE_PREFIX}-ACME`);
    expect(body.name).toBe("Acme Apparel");
    expect(body.isActive).toBe(true);
    expect(body.createdBy).toBe(managerId);
    customerId = body.id;

    const get = await app.request(`/api/customers/${customerId}`, {
      headers: { cookie: managerCookie },
    });
    expect(get.status).toBe(200);
  });

  it("rejects a duplicate customer code with 409", async () => {
    const res = await app.request(
      "/api/customers",
      jsonRequest(managerCookie, "POST", { code: `${CODE_PREFIX}-ACME`, name: "Other Acme" })
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CONFLICT");
  });

  it("updates a customer", async () => {
    const res = await app.request(
      `/api/customers/${customerId}`,
      jsonRequest(managerCookie, "PATCH", { name: "Acme Apparel Ltd", paymentTerms: "Net 45" })
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as CustomerBody;
    expect(body.name).toBe("Acme Apparel Ltd");
    expect(body.paymentTerms).toBe("Net 45");
    expect(body.updatedBy).toBe(managerId);
  });

  it("creates customer contacts, keeping only one primary", async () => {
    const first = await app.request(
      `/api/customers/${customerId}/contacts`,
      jsonRequest(managerCookie, "POST", {
        name: "Priya Shah",
        designation: "Buyer",
        email: "Priya@Acme.example",
        isPrimary: true,
      })
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as ContactBody;
    expect(firstBody.customerId).toBe(customerId);
    expect(firstBody.isPrimary).toBe(true);

    const second = await app.request(
      `/api/customers/${customerId}/contacts`,
      jsonRequest(managerCookie, "POST", { name: "Ravi Kumar", isPrimary: true })
    );
    expect(second.status).toBe(201);

    const list = await app.request(`/api/customers/${customerId}/contacts`, {
      headers: { cookie: managerCookie },
    });
    expect(list.status).toBe(200);
    const { items } = (await list.json()) as { items: ContactBody[] };
    expect(items).toHaveLength(2);
    expect(items.filter((contact) => contact.isPrimary).map((c) => c.name)).toEqual(["Ravi Kumar"]);

    const patch = await app.request(
      `/api/customers/${customerId}/contacts/${firstBody.id}`,
      jsonRequest(managerCookie, "PATCH", { designation: "Senior Buyer" })
    );
    expect(patch.status).toBe(200);
  });

  it("deactivates a customer via isActive", async () => {
    const res = await app.request(
      `/api/customers/${customerId}`,
      jsonRequest(managerCookie, "PATCH", { isActive: false })
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as CustomerBody).isActive).toBe(false);

    const inactive = await app.request("/api/customers?isActive=false&pageSize=200", {
      headers: { cookie: managerCookie },
    });
    const { items } = (await inactive.json()) as { items: CustomerBody[] };
    expect(items.map((customer) => customer.id)).toContain(customerId);
  });

  it("does not expose a DELETE endpoint", async () => {
    const res = await app.request(`/api/customers/${customerId}`, {
      method: "DELETE",
      headers: { cookie: managerCookie },
    });
    expect(res.status).toBe(404);
  });

  it("writes audit log entries for customer and contact changes", async () => {
    const customerEntries = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "customer"), eq(auditLogs.entityId, customerId)));

    expect(customerEntries.map((entry) => entry.action).sort()).toEqual([
      "customer.created",
      "customer.deactivated",
      "customer.updated",
    ]);
    expect(customerEntries.every((entry) => entry.userId === managerId)).toBe(true);

    const deactivated = customerEntries.find((entry) => entry.action === "customer.deactivated");
    expect(deactivated?.oldValue).toEqual({ isActive: true });
    expect(deactivated?.newValue).toEqual({ isActive: false });

    const contactIds = (
      await db
        .select({ id: customerContacts.id })
        .from(customerContacts)
        .where(eq(customerContacts.customerId, customerId))
    ).map((row) => row.id);
    const contactEntries = await db
      .select()
      .from(auditLogs)
      .where(
        and(eq(auditLogs.entityType, "customer_contact"), inArray(auditLogs.entityId, contactIds))
      );
    expect(contactEntries.map((entry) => entry.action).sort()).toEqual([
      "customer_contact.created",
      "customer_contact.created",
      "customer_contact.updated",
    ]);
  });
});
