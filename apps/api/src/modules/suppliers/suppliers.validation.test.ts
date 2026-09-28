import { describe, expect, it } from "vitest";
import {
  createSupplierContactSchema,
  createSupplierSchema,
  listSuppliersQuerySchema,
  updateSupplierContactSchema,
  updateSupplierSchema,
} from "@garment-erp/validation";

describe("supplier validation contracts", () => {
  it("trims and uppercases the supplier code", () => {
    const parsed = createSupplierSchema.parse({ code: "  fab-01 ", name: "  Fabco  " });
    expect(parsed.code).toBe("FAB-01");
    expect(parsed.name).toBe("Fabco");
  });

  it("rejects codes with disallowed characters or out-of-range length", () => {
    expect(createSupplierSchema.safeParse({ code: "FAB 01", name: "X" }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ code: "-FAB", name: "X" }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ code: "F", name: "X" }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ code: "F".repeat(31), name: "X" }).success).toBe(false);
  });

  it("requires code and name on create", () => {
    expect(createSupplierSchema.safeParse({ name: "X" }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ code: "FAB", name: "   " }).success).toBe(false);
  });

  it("accepts lead time as a non-negative integer only", () => {
    const base = { code: "FAB", name: "X" };
    expect(createSupplierSchema.safeParse({ ...base, leadTimeDays: 0 }).success).toBe(true);
    expect(createSupplierSchema.safeParse({ ...base, leadTimeDays: -1 }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ ...base, leadTimeDays: 2.5 }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ ...base, leadTimeDays: "7" }).success).toBe(false);
  });

  it("accepts rating as a whole number from 1 to 5", () => {
    const base = { code: "FAB", name: "X" };
    expect(createSupplierSchema.safeParse({ ...base, rating: 1 }).success).toBe(true);
    expect(createSupplierSchema.safeParse({ ...base, rating: 5 }).success).toBe(true);
    expect(createSupplierSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ ...base, rating: 3.5 }).success).toBe(false);
  });

  it("allows clearing lead time and rating with null on update", () => {
    const parsed = updateSupplierSchema.parse({ leadTimeDays: null, rating: null });
    expect(parsed).toEqual({ leadTimeDays: null, rating: null });
  });

  it("rejects an empty PATCH payload", () => {
    expect(updateSupplierSchema.safeParse({}).success).toBe(false);
    expect(updateSupplierContactSchema.safeParse({}).success).toBe(false);
  });

  it("normalizes contact email to lowercase and rejects invalid emails", () => {
    const parsed = createSupplierContactSchema.parse({ name: "Anil", email: " Anil@Fabco.Example " });
    expect(parsed.email).toBe("anil@fabco.example");
    expect(createSupplierContactSchema.safeParse({ name: "Anil", email: "nope" }).success).toBe(
      false
    );
  });

  it("parses list filters from query-string values", () => {
    const parsed = listSuppliersQuerySchema.parse({ page: "2", isActive: "false", search: " fab " });
    expect(parsed).toEqual({ page: 2, pageSize: 50, isActive: false, search: "fab" });
  });
});
