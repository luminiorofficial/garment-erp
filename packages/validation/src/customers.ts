import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

// Codes are stored uppercase so "acme-01" and "ACME-01" can't coexist.
const customerCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(30)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "code may only contain letters, digits, '-' and '_'");

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

export const createCustomerSchema = z.object({
  code: customerCodeSchema,
  name: z.string().trim().min(1).max(200),
  billingAddress: optionalText(1000),
  shippingAddress: optionalText(1000),
  paymentTerms: optionalText(200),
  taxInformation: optionalText(500),
  notes: optionalText(2000),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// Setting isActive to false is how a customer is "deleted" — there is no
// DELETE endpoint.
export const updateCustomerSchema = z
  .object({
    code: customerCodeSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    billingAddress: nullableText(1000),
    shippingAddress: nullableText(1000),
    paymentTerms: nullableText(200),
    taxInformation: nullableText(500),
    notes: nullableText(2000),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

export const createCustomerContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  designation: optionalText(100),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: optionalText(30),
  isPrimary: z.boolean().optional(),
});

export type CreateCustomerContactInput = z.infer<typeof createCustomerContactSchema>;

export const updateCustomerContactSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    designation: nullableText(100),
    email: z.string().trim().toLowerCase().email().nullable().optional(),
    phone: nullableText(30),
    isPrimary: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export type UpdateCustomerContactInput = z.infer<typeof updateCustomerContactSchema>;
