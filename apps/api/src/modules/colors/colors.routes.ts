import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createColorSchema,
  listColorsQuerySchema,
  updateColorSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createColor,
  getColorById,
  listColorsPage,
  updateColorDetails,
} from "./colors.service.js";

// No DELETE route by design: colors are deactivated via PATCH { isActive: false }.
export const colorsRoute = new Hono<AppEnv>();

colorsRoute.use("*", requireAuthenticatedUser);

colorsRoute.get("/", requirePermission(PermissionCode.COLORS_VIEW), async (c) => {
  const query = listColorsQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const items = await listColorsPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

colorsRoute.post("/", requirePermission(PermissionCode.COLORS_CREATE), async (c) => {
  const input = createColorSchema.parse(await c.req.json());
  const created = await createColor(input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(created, 201);
});

colorsRoute.get("/:id", requirePermission(PermissionCode.COLORS_VIEW), async (c) => {
  return c.json(await getColorById(uuidParamSchema.parse(c.req.param("id"))));
});

colorsRoute.patch("/:id", requirePermission(PermissionCode.COLORS_EDIT), async (c) => {
  const id = uuidParamSchema.parse(c.req.param("id"));
  const input = updateColorSchema.parse(await c.req.json());
  const updated = await updateColorDetails(id, input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});
