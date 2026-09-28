import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createCustomerContactSchema,
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerContactSchema,
  updateCustomerSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createCustomer,
  createCustomerContact,
  getContactsForCustomer,
  getCustomerById,
  listCustomersPage,
  updateCustomerContact,
  updateCustomerDetails,
} from "./customers.service.js";

// No DELETE routes by design: customers are deactivated via PATCH { isActive: false }.
export const customersRoute = new Hono<AppEnv>();

customersRoute.use("*", requireAuthenticatedUser);

customersRoute.get("/", requirePermission(PermissionCode.CUSTOMERS_VIEW), async (c) => {
  const query = listCustomersQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams)
  );
  const items = await listCustomersPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

customersRoute.post("/", requirePermission(PermissionCode.CUSTOMERS_CREATE), async (c) => {
  const input = createCustomerSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const created = await createCustomer(input, { actorUserId, ...getRequestMeta(c) });
  return c.json(created, 201);
});

customersRoute.get("/:id", requirePermission(PermissionCode.CUSTOMERS_VIEW), async (c) => {
  const customer = await getCustomerById(uuidParamSchema.parse(c.req.param("id")));
  return c.json(customer);
});

customersRoute.patch("/:id", requirePermission(PermissionCode.CUSTOMERS_EDIT), async (c) => {
  const id = uuidParamSchema.parse(c.req.param("id"));
  const input = updateCustomerSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const updated = await updateCustomerDetails(id, input, {
    actorUserId,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});

customersRoute.get(
  "/:id/contacts",
  requirePermission(PermissionCode.CUSTOMERS_VIEW),
  async (c) => {
    const items = await getContactsForCustomer(uuidParamSchema.parse(c.req.param("id")));
    return c.json({ items });
  }
);

customersRoute.post(
  "/:id/contacts",
  requirePermission(PermissionCode.CUSTOMERS_CREATE),
  async (c) => {
    const customerId = uuidParamSchema.parse(c.req.param("id"));
    const input = createCustomerContactSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const created = await createCustomerContact(customerId, input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(created, 201);
  }
);

customersRoute.patch(
  "/:id/contacts/:contactId",
  requirePermission(PermissionCode.CUSTOMERS_EDIT),
  async (c) => {
    const customerId = uuidParamSchema.parse(c.req.param("id"));
    const contactId = uuidParamSchema.parse(c.req.param("contactId"));
    const input = updateCustomerContactSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const updated = await updateCustomerContact(customerId, contactId, input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(updated);
  }
);
