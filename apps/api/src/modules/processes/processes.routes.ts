import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createProcessSchema,
  listProcessesQuerySchema,
  updateProcessSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createProcess,
  getProcessById,
  listProcessesPage,
  updateProcessDetails,
} from "./processes.service.js";

// No DELETE route by design: processes are deactivated via PATCH { isActive: false }.
export const processesRoute = new Hono<AppEnv>();

processesRoute.use("*", requireAuthenticatedUser);

processesRoute.get(
  "/",
  requirePermission(PermissionCode.PROCESSES_VIEW),
  async (c) => {
    const query = listProcessesQuerySchema.parse(
      Object.fromEntries(new URL(c.req.url).searchParams),
    );
    const items = await listProcessesPage(query);
    return c.json({ items, page: query.page, pageSize: query.pageSize });
  },
);

processesRoute.post(
  "/",
  requirePermission(PermissionCode.PROCESSES_CREATE),
  async (c) => {
    const input = createProcessSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const created = await createProcess(input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(created, 201);
  },
);

processesRoute.get(
  "/:id",
  requirePermission(PermissionCode.PROCESSES_VIEW),
  async (c) => {
    const process = await getProcessById(
      uuidParamSchema.parse(c.req.param("id")),
    );
    return c.json(process);
  },
);

processesRoute.patch(
  "/:id",
  requirePermission(PermissionCode.PROCESSES_EDIT),
  async (c) => {
    const id = uuidParamSchema.parse(c.req.param("id"));
    const input = updateProcessSchema.parse(await c.req.json());
    const actorUserId = c.get("user").id;
    const updated = await updateProcessDetails(id, input, {
      actorUserId,
      ...getRequestMeta(c),
    });
    return c.json(updated);
  },
);
