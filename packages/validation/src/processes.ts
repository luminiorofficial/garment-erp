import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

export const createProcessSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(50)
      .regex(
        /^[A-Z0-9][A-Z0-9_-]*$/,
        "code may only contain letters, digits, '-' and '_'",
      ),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateProcessSchema = createProcessSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "At least one field must be provided",
  );
export const listProcessesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type CreateProcessInput = z.infer<typeof createProcessSchema>;
export type UpdateProcessInput = z.infer<typeof updateProcessSchema>;
export type ListProcessesQuery = z.infer<typeof listProcessesQuerySchema>;
