import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

// A color is a commercial/design reference. `hexValue` is only a swatch for
// display; it is not a manufacturing shade. Shade/lot traceability belongs to
// the future fabric/inventory modules.
export const COLOR_HEX_PATTERN = /^#[0-9A-F]{6}$/;

export const createColorSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(30)
      .regex(
        /^[A-Z0-9][A-Z0-9_-]*$/,
        "code may only contain letters, digits, '-' and '_'",
      ),
    name: z.string().trim().min(1).max(100),
    // Buyer/palette reference such as a Pantone number.
    reference: z.string().trim().min(1).max(100).nullable().optional(),
    hexValue: z
      .string()
      .trim()
      .toUpperCase()
      .regex(COLOR_HEX_PATTERN, "hexValue must look like #1A2B3C")
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateColorSchema = createColorSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "At least one field must be provided",
  );
export const listColorsQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().trim().min(1).max(200).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();
export type CreateColorInput = z.infer<typeof createColorSchema>;
export type UpdateColorInput = z.infer<typeof updateColorSchema>;
export type ListColorsQuery = z.infer<typeof listColorsQuerySchema>;
