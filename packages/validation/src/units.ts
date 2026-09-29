import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

// Also enforced by the units_decimal_places_range CHECK constraint; exported so
// forms can size their inputs from the same source.
export const UNIT_DECIMAL_PLACES_MIN = 0;
export const UNIT_DECIMAL_PLACES_MAX = 6;
const decimalPlacesSchema = z
  .number()
  .int()
  .min(UNIT_DECIMAL_PLACES_MIN)
  .max(UNIT_DECIMAL_PLACES_MAX);

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
    decimalPlaces: decimalPlacesSchema.default(0),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateUnitSchema = createUnitSchema
  .partial()
  .extend({ decimalPlaces: decimalPlacesSchema.optional() })
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
