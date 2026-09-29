import { describe, expect, it } from "vitest";
import {
  createUnitSchema,
  updateUnitSchema,
  listUnitsQuerySchema,
} from "@garment-erp/validation";
describe("units validation", () => {
  it("normalizes codes and requires a valid code and name", () => {
    expect(
      createUnitSchema.parse({ code: " test-1 ", name: " Test " }),
    ).toMatchObject({ code: "TEST-1", name: "Test" });
    for (const code of ["", " ", "BAD CODE", "BAD/", "A".repeat(51)])
      expect(createUnitSchema.safeParse({ code, name: "Test" }).success).toBe(
        false,
      );
    expect(createUnitSchema.safeParse({ code: "OK", name: " " }).success).toBe(
      false,
    );
  });
  it("rejects empty patches and parses pagination/active filters", () => {
    expect(updateUnitSchema.safeParse({}).success).toBe(false);
    expect(updateUnitSchema.safeParse({ unknown: true }).success).toBe(false);
    expect(
      listUnitsQuerySchema.parse({
        page: "2",
        pageSize: "10",
        isActive: "false",
      }),
    ).toMatchObject({ page: 2, pageSize: 10, isActive: false });
  });
});
it("limits precision to integer 0..6 without adding a default on PATCH", () => {
  for (const decimalPlaces of [-1, 7, 1.5, "3", null])
    expect(
      createUnitSchema.safeParse({
        code: "KG",
        name: "Kilograms",
        decimalPlaces,
      }).success,
    ).toBe(false);
  expect(
    createUnitSchema.parse({ code: "PCS", name: "Pieces" }).decimalPlaces,
  ).toBe(0);
  expect(updateUnitSchema.parse({ name: "Updated" })).toEqual({
    name: "Updated",
  });
});
