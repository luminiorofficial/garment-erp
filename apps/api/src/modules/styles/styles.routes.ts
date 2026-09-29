import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createStyleSchema,
  createStyleVersionSchema,
  listStylesQuerySchema,
  updateStyleSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createStyle,
  createStyleVersion,
  getStyleById,
  getStyleVersion,
  listStylesPage,
  listStyleVersions,
  updateStyleDetails,
} from "./styles.service.js";

// No DELETE routes by design: styles are deactivated via PATCH { isActive: false }
// and style versions are immutable (create + read only).
export const stylesRoute = new Hono<AppEnv>();

stylesRoute.use("*", requireAuthenticatedUser);

stylesRoute.get("/", requirePermission(PermissionCode.STYLES_VIEW), async (c) => {
  const query = listStylesQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const items = await listStylesPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

stylesRoute.post("/", requirePermission(PermissionCode.STYLES_CREATE), async (c) => {
  const input = createStyleSchema.parse(await c.req.json());
  const created = await createStyle(input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(created, 201);
});

stylesRoute.get("/:id", requirePermission(PermissionCode.STYLES_VIEW), async (c) => {
  return c.json(await getStyleById(uuidParamSchema.parse(c.req.param("id"))));
});

stylesRoute.patch("/:id", requirePermission(PermissionCode.STYLES_EDIT), async (c) => {
  const id = uuidParamSchema.parse(c.req.param("id"));
  const input = updateStyleSchema.parse(await c.req.json());
  const updated = await updateStyleDetails(id, input, {
    actorUserId: c.get("user").id,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});

stylesRoute.get(
  "/:id/versions",
  requirePermission(PermissionCode.STYLES_VIEW),
  async (c) => {
    const items = await listStyleVersions(uuidParamSchema.parse(c.req.param("id")));
    return c.json({ items });
  },
);

stylesRoute.post(
  "/:id/versions",
  requirePermission(PermissionCode.STYLES_EDIT),
  async (c) => {
    const styleId = uuidParamSchema.parse(c.req.param("id"));
    const input = createStyleVersionSchema.parse(await c.req.json());
    const created = await createStyleVersion(styleId, input, {
      actorUserId: c.get("user").id,
      ...getRequestMeta(c),
    });
    return c.json(created, 201);
  },
);

stylesRoute.get(
  "/:id/versions/:versionId",
  requirePermission(PermissionCode.STYLES_VIEW),
  async (c) => {
    const styleId = uuidParamSchema.parse(c.req.param("id"));
    const versionId = uuidParamSchema.parse(c.req.param("versionId"));
    return c.json(await getStyleVersion(styleId, versionId));
  },
);
