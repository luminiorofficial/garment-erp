import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createSupplierContactSchema,
  createSupplierSchema,
  listSuppliersQuerySchema,
  updateSupplierContactSchema,
  updateSupplierSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createSupplier,
  createSupplierContact,
  getContactsForSupplier,
  getSupplierById,
  listSuppliersPage,
  updateSupplierContact,
  updateSupplierDetails,
} from "./suppliers.service.js";

// No DELETE routes by design: suppliers are deactivated via PATCH { isActive: false }.
export const suppliersRoute = new Hono<AppEnv>();

suppliersRoute.use("*", requireAuthenticatedUser);

suppliersRoute.get("/", requirePermission(PermissionCode.SUPPLIERS_VIEW), async (c) => {
  const query = listSuppliersQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams)
  );
  const items = await listSuppliersPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

suppliersRoute.post("/", requirePermission(PermissionCode.SUPPLIERS_CREATE), async (c) => {
  const input = createSupplierSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const created = await createSupplier(input, { actorUserId, ...getRequestMeta(c) });
  return c.json(created, 201);
});

suppliersRoute.get("/:id", requirePermission(PermissionCode.SUPPLIERS_VIEW), async (c) => {
  const supplier = await getSupplierById(uuidParamSchema.parse(c.req.param("id")));
  return c.json(supplier);
});

suppliersRoute.patch("/:id", requirePermission(PermissionCode.SUPPLIERS_EDIT), async (c) => {
  const id = uuidParamSchema.parse(c.req.param("id"));
  const input = updateSupplierSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const updated = await updateSupplierDetails(id, input, {
    actorUserId,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});

suppliersRoute.get(
  "/:id/contacts",
  requirePermission(PermissionCode.SUPPLIERS_VIEW),
  async (c) => {
    const items = await getContactsForSupplier(uuidParamSchema.parse(c.req.param("id")));
    return c.json({ items });
  }
);

suppliersRoute.post(
  "/:id/contacts",
  requirePermission(PermissionCode.SUPPLIERS_CREATE),
  async (c) => {
    const supplierId = uuidParamSchema.parse(c.req.param("id"));
    const input = createSupplierContactSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const created = await createSupplierContact(supplierId, input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(created, 201);
  }
);

suppliersRoute.patch(
  "/:id/contacts/:contactId",
  requirePermission(PermissionCode.SUPPLIERS_EDIT),
  async (c) => {
    const supplierId = uuidParamSchema.parse(c.req.param("id"));
    const contactId = uuidParamSchema.parse(c.req.param("contactId"));
    const input = updateSupplierContactSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const updated = await updateSupplierContact(supplierId, contactId, input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(updated);
  }
);
