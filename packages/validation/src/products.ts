import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

// A Product is the general garment identity (e.g. "Crew-neck T-shirt");
// a Style (see styles.ts) is a specific manufacturable/customer-facing
// variant of it.
export const createProductSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(30)
      .regex(
        /^[A-Z0-9][A-Z0-9_-]*$/,
        "code may only contain letters, digits, '-' and '_'",
      ),
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateProductSchema = createProductSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "At least one field must be provided",
  );
export const listProductsQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().trim().min(1).max(200).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
