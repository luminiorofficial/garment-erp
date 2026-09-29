/**
 * Sizes, colors, products, styles and style versions end to end against the
 * real database: RBAC gating, unique codes, filters, pagination, reference
 * rules for inactive masters, size/color assignment, immutable versioning and
 * audit logging. Skips (not fails) when no database is reachable.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, like, sql } from "drizzle-orm";
import { PermissionCode } from "@garment-erp/shared";
import { db } from "../db/client.js";
import {
  auditLogs,
  colors,
  customers,
  permissions,
  products,
  rolePermissions,
  roles,
  sizes,
  styleColors,
  styleSizes,
  styles,
  styleVersions,
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

const MANAGER_EMAIL = "integration-test-style-manager@example.com";
const NO_PERMISSION_EMAIL = "integration-test-style-noperm@example.com";
const TEST_EMAILS = [MANAGER_EMAIL, NO_PERMISSION_EMAIL];
const TEST_PASSWORD = "correct horse battery staple";
const ROLE_CODE = "integration_test_style_role";
const P = `PS${Date.now().toString(36).toUpperCase()}`;
const ALL_PERMISSIONS = [
  PermissionCode.SIZES_VIEW,
  PermissionCode.SIZES_CREATE,
  PermissionCode.SIZES_EDIT,
  PermissionCode.COLORS_VIEW,
  PermissionCode.COLORS_CREATE,
  PermissionCode.COLORS_EDIT,
  PermissionCode.PRODUCTS_VIEW,
  PermissionCode.PRODUCTS_CREATE,
  PermissionCode.PRODUCTS_EDIT,
  PermissionCode.STYLES_VIEW,
  PermissionCode.STYLES_CREATE,
  PermissionCode.STYLES_EDIT,
];

async function login(email: string): Promise<string> {
  const res = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  expect(res.status).toBe(200);
  const match = /session=([^;]+)/.exec(res.headers.get("set-cookie") ?? "");
  if (!match) throw new Error("No session cookie in response");
  return `session=${match[1]}`;
}

describe.skipIf(!dbAvailable)("product & style masters integration", () => {
  let managerId: string;
  let roleId: string;
  let cookie: string;
  let noPermCookie: string;

  const call = (method: string, path: string, body?: unknown, c = cookie) =>
    app.request(path, {
      method,
      headers: { "content-type": "application/json", cookie: c },
      body: body === undefined || method === "GET" ? undefined : JSON.stringify(body),
    });
  const json = async <T>(res: Response) => (await res.json()) as T;

  beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const rows = await db
      .insert(users)
      .values(
        TEST_EMAILS.map((email) => ({ email, passwordHash, firstName: "Style", lastName: "Test" })),
      )
      .returning();
    managerId = rows[0]!.id;

    const [role] = await db
      .insert(roles)
      .values({ code: ROLE_CODE, name: "Integration Test Style Role" })
      .returning();
    roleId = role!.id;
    for (const code of ALL_PERMISSIONS) {
      const [resource, action] = code.split(".");
      await db
        .insert(permissions)
        .values({ code, resource: resource!, action: action! })
        .onConflictDoNothing({ target: permissions.code });
    }
    const rowsP = await db.select().from(permissions).where(inArray(permissions.code, ALL_PERMISSIONS));
    for (const p of rowsP)
      await db.insert(rolePermissions).values({ roleId, permissionId: p.id });
    await db.insert(userRoles).values({ userId: managerId, roleId });

    cookie = await login(MANAGER_EMAIL);
    noPermCookie = await login(NO_PERMISSION_EMAIL);
  });

  afterAll(async () => {
    const styleRows = await db.select({ id: styles.id }).from(styles).where(like(styles.code, `${P}%`));
    const styleIds = styleRows.map((s) => s.id);
    if (styleIds.length) {
      await db.delete(styleVersions).where(inArray(styleVersions.styleId, styleIds));
      await db.delete(styleSizes).where(inArray(styleSizes.styleId, styleIds));
      await db.delete(styleColors).where(inArray(styleColors.styleId, styleIds));
      await db.delete(styles).where(inArray(styles.id, styleIds));
    }
    await db.delete(products).where(like(products.code, `${P}%`));
    await db.delete(sizes).where(like(sizes.code, `${P}%`));
    await db.delete(colors).where(like(colors.code, `${P}%`));
    await db.delete(customers).where(like(customers.code, `${P}%`));
    const userRows = await db.select({ id: users.id }).from(users).where(inArray(users.email, TEST_EMAILS));
    if (userRows.length)
      await db.delete(auditLogs).where(inArray(auditLogs.userId, userRows.map((u) => u.id)));
    if (roleId) {
      await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      await db.delete(roles).where(eq(roles.id, roleId));
    }
    await db.delete(users).where(inArray(users.email, TEST_EMAILS));
  });

  const auditActions = async (entityId: string) =>
    (await db.select().from(auditLogs).where(eq(auditLogs.entityId, entityId))).map((a) => a.action);

  it("requires authentication and the matching permission on every route", async () => {
    const id = crypto.randomUUID();
    for (const resource of ["sizes", "colors", "products", "styles"]) {
      for (const [method, suffix] of [["GET", ""], ["POST", ""], ["GET", `/${id}`], ["PATCH", `/${id}`]] as const) {
        expect((await app.request(`/api/${resource}${suffix}`, { method })).status).toBe(401);
        expect((await call(method, `/api/${resource}${suffix}`, {}, noPermCookie)).status).toBe(403);
      }
    }
    for (const [method, suffix] of [["GET", "/versions"], ["POST", "/versions"], ["GET", `/versions/${id}`]] as const) {
      expect((await app.request(`/api/styles/${id}${suffix}`, { method })).status).toBe(401);
      expect((await call(method, `/api/styles/${id}${suffix}`, {}, noPermCookie)).status).toBe(403);
    }
  });

  for (const [resource, entity, body] of [
    ["sizes", "size", { name: " Extra Large ", sequence: 4 }],
    ["colors", "color", { name: "Navy", reference: "19-4052", hexValue: "#1f3a5f" }],
    ["products", "product", { name: "Crew Tee", category: "Tops", description: "Basic tee" }],
  ] as const) {
    it(`${resource}: create, duplicate, get, patch, status, list, search, pagination, audit`, async () => {
      const path = `/api/${resource}`;
      const code = `${P}-${entity}`.toLowerCase();

      const created = await call("POST", path, { code, ...body });
      expect(created.status).toBe(201);
      const row = await json<Record<string, unknown> & { id: string }>(created);
      expect(row).toMatchObject({ code: code.toUpperCase(), createdBy: managerId, isActive: true });
      expect(row.name).toBe(body.name.trim());
      if (resource === "colors") expect(row.hexValue).toBe("#1F3A5F");

      expect((await call("POST", path, { code, ...body })).status).toBe(409);
      expect((await call("GET", `${path}/${row.id}`)).status).toBe(200);
      expect((await call("GET", `${path}/${crypto.randomUUID()}`)).status).toBe(404);
      expect((await call("GET", `${path}/not-a-uuid`)).status).toBe(422);
      expect((await call("PATCH", `${path}/${row.id}`, {})).status).toBe(422);
      expect((await call("PATCH", `${path}/${row.id}`, { unknown: 1 })).status).toBe(422);

      // A second record to test code conflicts on rename and pagination.
      const second = await json<{ id: string }>(
        await call("POST", path, { code: `${code}-2`, ...body }),
      );
      expect((await call("PATCH", `${path}/${second.id}`, { code })).status).toBe(409);

      expect((await call("PATCH", `${path}/${row.id}`, { name: "Edited" })).status).toBe(200);
      const off = await call("PATCH", `${path}/${row.id}`, { isActive: false });
      expect(await json<{ isActive: boolean }>(off)).toMatchObject({ isActive: false });
      expect((await call("PATCH", `${path}/${row.id}`, { isActive: true })).status).toBe(200);
      await call("PATCH", `${path}/${row.id}`, { isActive: false });

      const search = await json<{ items: { id: string }[] }>(
        await call("GET", `${path}?search=${encodeURIComponent(code.slice(0, -1))}&pageSize=200`),
      );
      expect(search.items.map((i) => i.id)).toEqual(expect.arrayContaining([row.id, second.id]));
      const inactive = await json<{ items: { id: string; isActive: boolean }[] }>(
        await call("GET", `${path}?search=${encodeURIComponent(P)}&isActive=false&pageSize=200`),
      );
      expect(inactive.items.map((i) => i.id)).toEqual([row.id]);
      const page1 = await json<{ items: unknown[]; page: number; pageSize: number }>(
        await call("GET", `${path}?search=${encodeURIComponent(P)}&pageSize=1&page=1`),
      );
      expect(page1).toMatchObject({ page: 1, pageSize: 1 });
      expect(page1.items).toHaveLength(1);
      expect((await call("GET", `${path}?pageSize=0`)).status).toBe(422);
      expect((await call("GET", `${path}?isActive=maybe`)).status).toBe(422);

      expect(await auditActions(row.id)).toEqual(
        expect.arrayContaining([
          `${entity}.created`,
          `${entity}.updated`,
          `${entity}.deactivated`,
          `${entity}.activated`,
        ]),
      );
      // No DELETE route.
      expect((await call("DELETE", `${path}/${row.id}`)).status).toBe(404);
    });
  }

  it("validates size sequence, color hex and product category", async () => {
    expect((await call("POST", "/api/sizes", { code: `${P}-NEG`, name: "n", sequence: -1 })).status).toBe(422);
    expect((await call("POST", "/api/sizes", { code: `${P}-NOSEQ`, name: "n" })).status).toBe(422);
    expect((await call("POST", "/api/colors", { code: `${P}-BAD`, name: "n", hexValue: "blue" })).status).toBe(422);
    expect((await call("POST", "/api/products", { code: `${P}-NOCAT`, name: "n" })).status).toBe(422);
  });

  it("orders sizes by sequence", async () => {
    const codes = [`${P}-SEQC`, `${P}-SEQA`, `${P}-SEQB`];
    const seqs = [3, 1, 2];
    for (const [i, code] of codes.entries())
      await call("POST", "/api/sizes", { code, name: code, sequence: seqs[i] });
    const list = await json<{ items: { code: string }[] }>(
      await call("GET", `/api/sizes?search=${P}-SEQ&pageSize=50`),
    );
    expect(list.items.map((s) => s.code)).toEqual([`${P}-SEQA`, `${P}-SEQB`, `${P}-SEQC`]);
  });

  describe("styles", () => {
    const mk = async (resource: string, code: string, extra: object = {}) =>
      json<{ id: string }>(
        await call("POST", `/api/${resource}`, { code: `${P}-${code}`, name: code, ...extra }),
      );

    it("enforces active references, manages size/color sets and keeps historical references", async () => {
      const product = await mk("products", "STP", { category: "Tops" });
      const product2 = await mk("products", "STP2", { category: "Tops" });
      const size1 = await mk("sizes", "SS1", { sequence: 1 });
      const size2 = await mk("sizes", "SS2", { sequence: 2 });
      const color1 = await mk("colors", "SC1");
      const color2 = await mk("colors", "SC2");
      const [customer] = await db
        .insert(customers)
        .values({ code: `${P}-CUST`, name: "Buyer" })
        .returning();

      // Unknown / inactive references are rejected with 422.
      const base = { code: `${P}-STYLE1`, name: "Polo" };
      expect((await call("POST", "/api/styles", { ...base, productId: crypto.randomUUID() })).status).toBe(422);
      await call("PATCH", `/api/products/${product2.id}`, { isActive: false });
      expect((await call("POST", "/api/styles", { ...base, productId: product2.id })).status).toBe(422);
      expect(
        (await call("POST", "/api/styles", { ...base, productId: product.id, customerId: crypto.randomUUID() })).status,
      ).toBe(422);
      expect(
        (await call("POST", "/api/styles", { ...base, productId: product.id, sizeIds: [crypto.randomUUID()] })).status,
      ).toBe(422);
      expect((await call("POST", "/api/styles", { ...base, productId: "x" })).status).toBe(422);

      const created = await call("POST", "/api/styles", {
        ...base,
        code: base.code.toLowerCase(),
        productId: product.id,
        customerId: customer!.id,
        sizeIds: [size1.id, size2.id],
        colorIds: [color1.id],
      });
      expect(created.status).toBe(201);
      const style = await json<{ id: string; code: string; sizeIds: string[]; colorIds: string[] }>(created);
      expect(style.code).toBe(base.code);
      expect(style.sizeIds.sort()).toEqual([size1.id, size2.id].sort());
      expect((await call("POST", "/api/styles", { ...base, productId: product.id })).status).toBe(409);

      const detail = await json<{ sizeIds: string[]; colorIds: string[] }>(
        await call("GET", `/api/styles/${style.id}`),
      );
      expect(detail.colorIds).toEqual([color1.id]);
      expect((await call("GET", `/api/styles/${crypto.randomUUID()}`)).status).toBe(404);

      // Deactivate referenced masters: existing links stay, and unrelated edits still work.
      await call("PATCH", `/api/sizes/${size1.id}`, { isActive: false });
      await call("PATCH", `/api/colors/${color1.id}`, { isActive: false });
      await call("PATCH", `/api/products/${product.id}`, { isActive: false });
      const kept = await call("PATCH", `/api/styles/${style.id}`, {
        name: "Polo v2",
        productId: product.id,
        sizeIds: [size1.id, size2.id],
        colorIds: [color1.id],
      });
      expect(kept.status).toBe(200);
      expect(await json<{ sizeIds: string[] }>(kept)).toMatchObject({ sizeIds: [size1.id, size2.id].sort() });

      // But adding an inactive size/color, or moving to an inactive product, is refused.
      expect((await call("PATCH", `/api/styles/${style.id}`, { sizeIds: [size2.id, size1.id, (await mk("sizes", "SS3", { sequence: 3 })).id] })).status).toBe(200);
      const inactiveSize = await mk("sizes", "SSX", { sequence: 9 });
      await call("PATCH", `/api/sizes/${inactiveSize.id}`, { isActive: false });
      expect((await call("PATCH", `/api/styles/${style.id}`, { sizeIds: [inactiveSize.id] })).status).toBe(422);
      expect((await call("PATCH", `/api/styles/${style.id}`, { colorIds: [color1.id, color2.id] })).status).toBe(200);
      const inactiveColor = await mk("colors", "SCX");
      await call("PATCH", `/api/colors/${inactiveColor.id}`, { isActive: false });
      expect((await call("PATCH", `/api/styles/${style.id}`, { colorIds: [inactiveColor.id] })).status).toBe(422);
      expect((await call("PATCH", `/api/styles/${style.id}`, { productId: product2.id })).status).toBe(422);

      // Removal and clearing the customer.
      const cleared = await call("PATCH", `/api/styles/${style.id}`, { sizeIds: [], customerId: null });
      expect(await json<{ sizeIds: string[]; customerId: string | null }>(cleared)).toMatchObject({
        sizeIds: [],
        customerId: null,
      });

      // Filters + status + search.
      await call("PATCH", `/api/styles/${style.id}`, { isActive: false });
      const byProduct = await json<{ items: { id: string }[] }>(
        await call("GET", `/api/styles?productId=${product.id}`),
      );
      expect(byProduct.items.map((s) => s.id)).toEqual([style.id]);
      const byCustomer = await json<{ items: unknown[] }>(
        await call("GET", `/api/styles?customerId=${customer!.id}`),
      );
      expect(byCustomer.items).toHaveLength(0);
      const inactive = await json<{ items: { id: string }[] }>(
        await call("GET", `/api/styles?isActive=false&search=${P}-STYLE`),
      );
      expect(inactive.items.map((s) => s.id)).toEqual([style.id]);
      expect((await call("GET", "/api/styles?productId=nope")).status).toBe(422);
      expect((await call("PATCH", `/api/styles/${style.id}`, {})).status).toBe(422);

      // Audit trail includes set changes.
      const audits = await db.select().from(auditLogs).where(eq(auditLogs.entityId, style.id));
      expect(audits.map((a) => a.action)).toEqual(
        expect.arrayContaining(["style.created", "style.updated", "style.deactivated"]),
      );
      expect(
        audits.some((a) => (a.newValue as { sizeIds?: string[] } | null)?.sizeIds?.length === 0),
      ).toBe(true);
      expect((await call("DELETE", `/api/styles/${style.id}`)).status).toBe(404);
    });

    it("creates immutable, sequential versions and keeps history", async () => {
      const product = await mk("products", "VP", { category: "Tops" });
      const style = await json<{ id: string }>(
        await call("POST", "/api/styles", { code: `${P}-VSTYLE`, name: "V", productId: product.id }),
      );
      const other = await json<{ id: string }>(
        await call("POST", "/api/styles", { code: `${P}-VOTHER`, name: "V2", productId: product.id }),
      );

      expect((await call("POST", `/api/styles/${style.id}/versions`, {})).status).toBe(422);
      expect((await call("POST", `/api/styles/${crypto.randomUUID()}/versions`, { changeSummary: "x" })).status).toBe(404);
      expect((await call("POST", `/api/styles/${style.id}/versions`, { changeSummary: "x", versionNumber: 7 })).status).toBe(422);

      const v1 = await json<{ id: string; versionNumber: number; createdBy: string }>(
        await call("POST", `/api/styles/${style.id}/versions`, { changeSummary: "Initial", specification: "Spec A" }),
      );
      const v2 = await json<{ id: string; versionNumber: number }>(
        await call("POST", `/api/styles/${style.id}/versions`, { changeSummary: "Collar change" }),
      );
      expect([v1.versionNumber, v2.versionNumber]).toEqual([1, 2]);
      expect(v1.createdBy).toBe(managerId);

      // Concurrent creation still yields distinct consecutive numbers.
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          call("POST", `/api/styles/${style.id}/versions`, { changeSummary: `race ${i}` }),
        ),
      );
      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);

      const list = await json<{ items: { versionNumber: number; id: string }[] }>(
        await call("GET", `/api/styles/${style.id}/versions`),
      );
      expect(list.items.map((v) => v.versionNumber)).toEqual([7, 6, 5, 4, 3, 2, 1]);

      // V1 is untouched by later versions; reads are scoped to their style.
      const again = await json<{ specification: string }>(
        await call("GET", `/api/styles/${style.id}/versions/${v1.id}`),
      );
      expect(again.specification).toBe("Spec A");
      expect((await call("GET", `/api/styles/${other.id}/versions/${v1.id}`)).status).toBe(404);
      expect((await call("GET", `/api/styles/${style.id}/versions/bad`)).status).toBe(422);
      expect((await call("PATCH", `/api/styles/${style.id}/versions/${v1.id}`, { changeSummary: "x" })).status).toBe(404);
      expect((await call("DELETE", `/api/styles/${style.id}/versions/${v1.id}`)).status).toBe(404);

      expect(await auditActions(v2.id)).toEqual(["style.version_created"]);

      // Inactive styles cannot gain versions, but history stays readable.
      await call("PATCH", `/api/styles/${style.id}`, { isActive: false });
      expect((await call("POST", `/api/styles/${style.id}/versions`, { changeSummary: "no" })).status).toBe(422);
      expect((await call("GET", `/api/styles/${style.id}/versions`)).status).toBe(200);

      // Database backstop: duplicate version numbers are impossible.
      await expect(
        db.insert(styleVersions).values({ styleId: style.id, versionNumber: 1 }),
      ).rejects.toThrow();
    });
  });
});
