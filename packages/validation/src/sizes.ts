import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

// Sizes are ordered by `sequence` (XS < S < M ...). Sequence is not unique:
// the master is not tied to a fixed size scale, and equal sequences fall back
// to code order. Also enforced by the sizes_sequence_non_negative CHECK.
export const SIZE_SEQUENCE_MIN = 0;
export const SIZE_SEQUENCE_MAX = 10_000;

export const createSizeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(20)
      .regex(
        /^[A-Z0-9][A-Z0-9_./-]*$/,
        "code may only contain letters, digits, '-', '_', '.' and '/'",
      ),
    name: z.string().trim().min(1).max(100),
    sequence: z.number().int().min(SIZE_SEQUENCE_MIN).max(SIZE_SEQUENCE_MAX),
    description: z.string().trim().min(1).max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateSizeSchema = createSizeSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "At least one field must be provided",
  );
export const listSizesQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().trim().min(1).max(200).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();
export type CreateSizeInput = z.infer<typeof createSizeSchema>;
export type UpdateSizeInput = z.infer<typeof updateSizeSchema>;
export type ListSizesQuery = z.infer<typeof listSizesQuerySchema>;
