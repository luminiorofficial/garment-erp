import { createMiddleware } from "hono/factory";
import { ApiErrors } from "../lib/api-error.js";
import { getPermissionCodesForUser } from "../modules/roles/roles.repository.js";
import type { AppEnv } from "../types/hono.js";
import type { PermissionCode } from "@garment-erp/shared";

/**
 * Must run after requireAuthenticatedUser. Computes the user's permission
 * set once per request (cached on context) so multiple requirePermission
 * calls in the same request don't re-query.
 */
export function requirePermission(code: PermissionCode) {
  return createMiddleware<AppEnv>(async (c, next) => {
    let permissionCodes = c.get("permissionCodes");

    if (!permissionCodes) {
      const user = c.get("user");
      permissionCodes = await getPermissionCodesForUser(user.id);
      c.set("permissionCodes", permissionCodes);
    }

    if (!permissionCodes.has(code)) {
      throw ApiErrors.forbidden(code);
    }

    await next();
  });
}
