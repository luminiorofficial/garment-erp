import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import { assignRoleSchema, createUserSchema, paginationQuerySchema, updateUserSchema } from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  assignRoleToUser,
  createUser,
  getRolesForUser,
  getUserById,
  listUsersPage,
  removeRoleFromUser,
  updateUserProfile,
} from "./users.service.js";

export const usersRoute = new Hono<AppEnv>();

usersRoute.use("*", requireAuthenticatedUser);

usersRoute.get("/", requirePermission(PermissionCode.USERS_VIEW), async (c) => {
  const { page, pageSize } = paginationQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams)
  );
  const items = await listUsersPage(page, pageSize);
  return c.json({ items, page, pageSize });
});

usersRoute.post("/", requirePermission(PermissionCode.USERS_CREATE), async (c) => {
  const input = createUserSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const created = await createUser(input, { actorUserId, ...getRequestMeta(c) });
  return c.json(created, 201);
});

usersRoute.get("/:id", requirePermission(PermissionCode.USERS_VIEW), async (c) => {
  const user = await getUserById(c.req.param("id"));
  return c.json(user);
});

usersRoute.patch("/:id", requirePermission(PermissionCode.USERS_EDIT), async (c) => {
  const input = updateUserSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const updated = await updateUserProfile(c.req.param("id"), input, {
    actorUserId,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});

usersRoute.get(
  "/:id/roles",
  requirePermission(PermissionCode.USERS_VIEW),
  async (c) => {
    const rolesForUser = await getRolesForUser(c.req.param("id"));
    return c.json({ items: rolesForUser });
  }
);

usersRoute.post(
  "/:id/roles",
  requirePermission(PermissionCode.USERS_ASSIGN_ROLE),
  async (c) => {
    const { roleId } = assignRoleSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    await assignRoleToUser(c.req.param("id"), roleId, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.body(null, 204);
  }
);

usersRoute.delete(
  "/:id/roles/:roleId",
  requirePermission(PermissionCode.USERS_ASSIGN_ROLE),
  async (c) => {
    const actorUserId = c.get("user").id;
    await removeRoleFromUser(c.req.param("id"), c.req.param("roleId"), {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.body(null, 204);
  }
);
