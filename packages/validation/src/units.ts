import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

export const createUnitSchema = z
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
    symbol: z.string().trim().min(1).max(20).nullable().optional(),
    decimalPlaces: z.number().int().min(0).max(6).default(0),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateUnitSchema = createUnitSchema
  .partial()
  .extend({ decimalPlaces: z.number().int().min(0).max(6).optional() })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "At least one field must be provided",
  );
export const listUnitsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>;
