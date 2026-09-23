import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import { assignPermissionSchema, createRoleSchema } from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  assignPermissionToRole,
  createRole,
  getPermissionsForRole,
  getRoleById,
  listAllRoles,
  removePermissionFromRole,
} from "./roles.service.js";

export const rolesRoute = new Hono<AppEnv>();

rolesRoute.use("*", requireAuthenticatedUser);

rolesRoute.get("/", requirePermission(PermissionCode.ROLES_VIEW), async (c) => {
  const items = await listAllRoles();
  return c.json({ items });
});

rolesRoute.post("/", requirePermission(PermissionCode.ROLES_CREATE), async (c) => {
  const input = createRoleSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const created = await createRole(input, { actorUserId, ...getRequestMeta(c) });
  return c.json(created, 201);
});

rolesRoute.get("/:id", requirePermission(PermissionCode.ROLES_VIEW), async (c) => {
  const role = await getRoleById(c.req.param("id"));
  return c.json(role);
});

rolesRoute.get(
  "/:id/permissions",
  requirePermission(PermissionCode.ROLES_VIEW),
  async (c) => {
    const items = await getPermissionsForRole(c.req.param("id"));
    return c.json({ items });
  }
);

rolesRoute.post(
  "/:id/permissions",
  requirePermission(PermissionCode.ROLES_ASSIGN_PERMISSION),
  async (c) => {
    const { permissionId } = assignPermissionSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    await assignPermissionToRole(c.req.param("id"), permissionId, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.body(null, 204);
  }
);

rolesRoute.delete(
  "/:id/permissions/:permissionId",
  requirePermission(PermissionCode.ROLES_ASSIGN_PERMISSION),
  async (c) => {
    const actorUserId = c.get("user").id;
    await removePermissionFromRole(c.req.param("id"), c.req.param("permissionId"), {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.body(null, 204);
  }
);
