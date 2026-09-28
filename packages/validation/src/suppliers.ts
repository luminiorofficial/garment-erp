import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

// Codes are stored uppercase so "fab-01" and "FAB-01" can't coexist.
const supplierCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(30)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "code may only contain letters, digits, '-' and '_'");

// Typical order-to-delivery time in calendar days. Capped at a year to catch
// typos; anything longer isn't a meaningful planning lead time.
const leadTimeDaysSchema = z.number().int().min(0).max(365);

// Supplier rating is a whole-number score from 1 (poor) to 5 (excellent).
// Omitted/null means "not yet rated" — there is no 0 rating. The same range
// is enforced by a CHECK constraint on suppliers.rating.
export const SUPPLIER_RATING_MIN = 1;
export const SUPPLIER_RATING_MAX = 5;
const ratingSchema = z.number().int().min(SUPPLIER_RATING_MIN).max(SUPPLIER_RATING_MAX);

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

export const createSupplierSchema = z.object({
  code: supplierCodeSchema,
  name: z.string().trim().min(1).max(200),
  billingAddress: optionalText(1000),
  shippingAddress: optionalText(1000),
  paymentTerms: optionalText(200),
  leadTimeDays: leadTimeDaysSchema.optional(),
  rating: ratingSchema.optional(),
  taxInformation: optionalText(500),
  notes: optionalText(2000),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

// Setting isActive to false is how a supplier is "deleted" — there is no
// DELETE endpoint.
export const updateSupplierSchema = z
  .object({
    code: supplierCodeSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    billingAddress: nullableText(1000),
    shippingAddress: nullableText(1000),
    paymentTerms: nullableText(200),
    leadTimeDays: leadTimeDaysSchema.nullable().optional(),
    rating: ratingSchema.nullable().optional(),
    taxInformation: nullableText(500),
    notes: nullableText(2000),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const listSuppliersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;

export const createSupplierContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  designation: optionalText(100),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: optionalText(30),
  isPrimary: z.boolean().optional(),
});

export type CreateSupplierContactInput = z.infer<typeof createSupplierContactSchema>;

export const updateSupplierContactSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    designation: nullableText(100),
    email: z.string().trim().toLowerCase().email().nullable().optional(),
    phone: nullableText(30),
    isPrimary: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export type UpdateSupplierContactInput = z.infer<typeof updateSupplierContactSchema>;
