import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

// Codes are stored uppercase so "jw-01" and "JW-01" can't coexist.
const jobWorkerCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(30)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "code may only contain letters, digits, '-' and '_'");

// The process a job worker performs (STITCHING, EMBROIDERY, ...). Free-form
// but normalized to an uppercase code so filtering is consistent; there is no
// fixed list until a Process Master exists.
const processSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(50)
  .regex(/^[A-Z0-9][A-Z0-9 _-]*$/, "process may only contain letters, digits, spaces, '-' and '_'");

// Unit the daily capacity is measured in (PCS, KG, MTR, ...). Free-form until
// a Unit Master exists.
const capacityUnitSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(10)
  .regex(/^[A-Z][A-Z0-9_]*$/, "capacityUnit may only contain letters, digits and '_'");

// Whole units per day, must be positive. Capped at a million to catch typos
// (and stay well inside a Postgres integer).
const capacityPerDaySchema = z.number().int().min(1).max(1_000_000);

// Typical issue-to-return turnaround in calendar days; same limits as the
// supplier lead time.
const leadTimeDaysSchema = z.number().int().min(0).max(365);

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

const CAPACITY_PAIRING_MESSAGE = "capacityPerDay and capacityUnit must be provided together";

export const createJobWorkerSchema = z
  .object({
    code: jobWorkerCodeSchema,
    name: z.string().trim().min(1).max(200),
    contactPerson: optionalText(200),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: optionalText(30),
    billingAddress: optionalText(1000),
    operatingAddress: optionalText(1000),
    process: processSchema.optional(),
    capacityPerDay: capacityPerDaySchema.optional(),
    capacityUnit: capacityUnitSchema.optional(),
    leadTimeDays: leadTimeDaysSchema.optional(),
    rateAgreement: optionalText(500),
    paymentTerms: optionalText(200),
    taxInformation: optionalText(500),
    notes: optionalText(2000),
  })
  .refine(
    (value) => (value.capacityPerDay === undefined) === (value.capacityUnit === undefined),
    { message: CAPACITY_PAIRING_MESSAGE, path: ["capacityUnit"] }
  );

export type CreateJobWorkerInput = z.infer<typeof createJobWorkerSchema>;

// Setting isActive to false is how a job worker is "deleted" — there is no
// DELETE endpoint. The capacity/unit pairing on update is checked by the
// service against the stored row, since a PATCH may send only one of them.
export const updateJobWorkerSchema = z
  .object({
    code: jobWorkerCodeSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    contactPerson: nullableText(200),
    email: z.string().trim().toLowerCase().email().nullable().optional(),
    phone: nullableText(30),
    billingAddress: nullableText(1000),
    operatingAddress: nullableText(1000),
    process: processSchema.nullable().optional(),
    capacityPerDay: capacityPerDaySchema.nullable().optional(),
    capacityUnit: capacityUnitSchema.nullable().optional(),
    leadTimeDays: leadTimeDaysSchema.nullable().optional(),
    rateAgreement: nullableText(500),
    paymentTerms: nullableText(200),
    taxInformation: nullableText(500),
    notes: nullableText(2000),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export type UpdateJobWorkerInput = z.infer<typeof updateJobWorkerSchema>;

export const listJobWorkersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  process: processSchema.optional(),
});

export type ListJobWorkersQuery = z.infer<typeof listJobWorkersQuerySchema>;
