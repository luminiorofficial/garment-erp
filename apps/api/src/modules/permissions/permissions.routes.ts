import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import type { AppEnv } from "../../types/hono.js";
import { listAllPermissions } from "../roles/roles.service.js";

export const permissionsRoute = new Hono<AppEnv>();

permissionsRoute.use("*", requireAuthenticatedUser);

permissionsRoute.get(
  "/",
  requirePermission(PermissionCode.PERMISSIONS_VIEW),
  async (c) => {
    const items = await listAllPermissions();
    return c.json({ items });
  }
);
