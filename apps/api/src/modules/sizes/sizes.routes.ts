import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createSizeSchema,
  listSizesQuerySchema,
  updateSizeSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createSize,
  getSizeById,
  listSizesPage,
  updateSizeDetails,
} from "./sizes.service.js";

// No DELETE route by design: sizes are deactivated via PATCH { isActive: false }.
export const sizesRoute = new Hono<AppEnv>();

sizesRoute.use("*", requireAuthenticatedUser);

sizesRoute.get("/", requirePermission(PermissionCode.SIZES_VIEW), async (c) => {
  const query = listSizesQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const items = await listSizesPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

sizesRoute.post("/", requirePermission(PermissionCode.SIZES_CREATE), async (c) => {
  const input = createSizeSchema.parse(await c.req.json());
  const created = await createSize(input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(created, 201);
});

sizesRoute.get("/:id", requirePermission(PermissionCode.SIZES_VIEW), async (c) => {
  return c.json(await getSizeById(uuidParamSchema.parse(c.req.param("id"))));
});

sizesRoute.patch("/:id", requirePermission(PermissionCode.SIZES_EDIT), async (c) => {
  const id = uuidParamSchema.parse(c.req.param("id"));
  const input = updateSizeSchema.parse(await c.req.json());
  const updated = await updateSizeDetails(id, input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});
