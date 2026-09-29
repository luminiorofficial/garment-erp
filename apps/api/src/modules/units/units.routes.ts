import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createUnitSchema,
  listUnitsQuerySchema,
  updateUnitSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createUnit,
  getUnitById,
  listUnitsPage,
  updateUnitDetails,
} from "./units.service.js";

// No DELETE route by design: units are deactivated via PATCH { isActive: false }.
export const unitsRoute = new Hono<AppEnv>();

unitsRoute.use("*", requireAuthenticatedUser);

unitsRoute.get("/", requirePermission(PermissionCode.UNITS_VIEW), async (c) => {
  const query = listUnitsQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const items = await listUnitsPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

unitsRoute.post(
  "/",
  requirePermission(PermissionCode.UNITS_CREATE),
  async (c) => {
    const input = createUnitSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const created = await createUnit(input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(created, 201);
  },
);

unitsRoute.get(
  "/:id",
  requirePermission(PermissionCode.UNITS_VIEW),
  async (c) => {
    const unit = await getUnitById(uuidParamSchema.parse(c.req.param("id")));
    return c.json(unit);
  },
);

unitsRoute.patch(
  "/:id",
  requirePermission(PermissionCode.UNITS_EDIT),
  async (c) => {
    const id = uuidParamSchema.parse(c.req.param("id"));
    const input = updateUnitSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const updated = await updateUnitDetails(id, input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(updated);
  },
);
