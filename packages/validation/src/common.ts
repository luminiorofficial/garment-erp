import { z } from "zod";

/**
 * Cross-cutting request/response contracts shared between apps/web and apps/api.
 * Backend validation remains authoritative — this package never replaces it,
 * it only lets both sides agree on the same shape without drifting apart.
 */

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
