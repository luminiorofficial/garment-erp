import { Hono } from "hono";
import { PermissionCode } from "@garment-erp/shared";
import {
  createJobWorkerSchema,
  listJobWorkersQuerySchema,
  updateJobWorkerSchema,
  uuidParamSchema,
} from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getRequestMeta } from "../../lib/request-context.js";
import type { AppEnv } from "../../types/hono.js";
import {
  createJobWorker,
  getJobWorkerById,
  listJobWorkersPage,
  updateJobWorkerDetails,
} from "./job-workers.service.js";

// No DELETE route by design: job workers are deactivated via PATCH { isActive: false }.
export const jobWorkersRoute = new Hono<AppEnv>();

jobWorkersRoute.use("*", requireAuthenticatedUser);

jobWorkersRoute.get("/", requirePermission(PermissionCode.JOB_WORKERS_VIEW), async (c) => {
  const query = listJobWorkersQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams)
  );
  const items = await listJobWorkersPage(query);
  return c.json({ items, page: query.page, pageSize: query.pageSize });
});

jobWorkersRoute.post("/", requirePermission(PermissionCode.JOB_WORKERS_CREATE), async (c) => {
  const input = createJobWorkerSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const created = await createJobWorker(input, { actorUserId, ...getRequestMeta(c) });
  return c.json(created, 201);
});

jobWorkersRoute.get("/:id", requirePermission(PermissionCode.JOB_WORKERS_VIEW), async (c) => {
  const jobWorker = await getJobWorkerById(uuidParamSchema.parse(c.req.param("id")));
  return c.json(jobWorker);
});

jobWorkersRoute.patch("/:id", requirePermission(PermissionCode.JOB_WORKERS_EDIT), async (c) => {
  const id = uuidParamSchema.parse(c.req.param("id"));
  const input = updateJobWorkerSchema.parse(await c.req.json());
  const actorUserId = c.get("user").id;
  const updated = await updateJobWorkerDetails(id, input, {
    actorUserId,
    ...getRequestMeta(c),
  });
  return c.json(updated);
});
