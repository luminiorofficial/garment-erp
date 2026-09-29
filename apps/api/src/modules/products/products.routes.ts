import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createProduct,
  getProductById,
  listProductsPage,
  updateProductDetails,
} from "./products.service.js";

// No DELETE route by design: products are deactivated via PATCH { isActive: false }.
export const productsRoute = new Hono<AppEnv>();

productsRoute.use("*", requireAuthenticatedUser);

productsRoute.get("/", requirePermission(PermissionCode.PRODUCTS_VIEW), async (c) => {
  const query = listProductsQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const items = await listProductsPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

productsRoute.post("/", requirePermission(PermissionCode.PRODUCTS_CREATE), async (c) => {
  const input = createProductSchema.parse(await c.req.json());
  const created = await createProduct(input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(created, 201);
});

productsRoute.get("/:id", requirePermission(PermissionCode.PRODUCTS_VIEW), async (c) => {
  return c.json(await getProductById(uuidParamSchema.parse(c.req.param("id"))));
});

productsRoute.patch("/:id", requirePermission(PermissionCode.PRODUCTS_EDIT), async (c) => {
  const id = uuidParamSchema.parse(c.req.param("id"));
  const input = updateProductSchema.parse(await c.req.json());
  const updated = await updateProductDetails(id, input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});
