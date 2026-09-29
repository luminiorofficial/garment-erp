import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

const idSchema = z.string().uuid();

// Sizes/colors a style may be ordered in. Sent as full sets: the service
// diffs against the stored set. Capped to keep a request bounded.
const idSetSchema = z
  .array(idSchema)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate ids");

const styleFieldsSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .regex(
      /^[A-Z0-9][A-Z0-9_./-]*$/,
      "style number may only contain letters, digits, '-', '_', '.' and '/'",
    ),
  name: z.string().trim().min(1).max(200),
  productId: idSchema,
  // Buyer-specific style. Optional: house styles have no customer.
  customerId: idSchema.nullable().optional(),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  sizeIds: idSetSchema.optional(),
  colorIds: idSetSchema.optional(),
  isActive: z.boolean().optional(),
});

export const createStyleSchema = styleFieldsSchema.strict();
export const updateStyleSchema = styleFieldsSchema
  .partial()
  .strict()
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "At least one field must be provided",
  );
export const listStylesQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().trim().min(1).max(200).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    productId: idSchema.optional(),
    customerId: idSchema.optional(),
  })
  .strict();

export type CreateStyleInput = z.infer<typeof createStyleSchema>;
export type UpdateStyleInput = z.infer<typeof updateStyleSchema>;
export type ListStylesQuery = z.infer<typeof listStylesQuerySchema>;

// A style version is an immutable snapshot of the style definition. It is not
// an approval and carries no BOM/sample data; those arrive with later modules.
export const createStyleVersionSchema = z
  .object({
    specification: z.string().trim().min(1).max(5000).optional(),
    changeSummary: z.string().trim().min(1).max(1000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.specification !== undefined || value.changeSummary !== undefined,
    "Provide a specification or a change summary",
  );
export type CreateStyleVersionInput = z.infer<typeof createStyleVersionSchema>;
