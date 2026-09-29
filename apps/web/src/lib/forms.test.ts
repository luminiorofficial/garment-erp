import { describe, expect, it } from "vitest";
import { createJobWorkerSchema, createUnitSchema } from "@garment-erp/validation";
import { blankToUndefined, formErrorsFromZod, numberOrUndefined, withNulls } from "./forms";

describe("form helpers", () => {
  it("turns blank text into undefined and trims the rest", () => {
    expect(blankToUndefined("   ")).toBeUndefined();
    expect(blankToUndefined("  hi ")).toBe("hi");
    expect(numberOrUndefined("")).toBeUndefined();
    expect(numberOrUndefined(" 12 ")).toBe(12);
  });

  it("fills omitted nullable keys with null so an edit can clear them", () => {
    const data = { name: "A", notes: undefined as string | undefined };
    expect(withNulls(data, ["notes"])).toEqual({ name: "A", notes: null });
  });

  it("maps schema issues to fields and reports capacity/unit pairing on the unit field", () => {
    const parsed = createJobWorkerSchema.safeParse({
      code: "jw-1",
      name: "Stitch Co",
      capacityPerDay: 500,
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const errors = formErrorsFromZod(parsed.error);
    expect(errors.fields.capacityUnitId).toMatch(/provided together/);
  });

  it("accepts a capacity with its unit and normalises the code", () => {
    const parsed = createJobWorkerSchema.safeParse({
      code: "jw-1",
      name: "Stitch Co",
      capacityPerDay: 500,
      capacityUnitId: "3f0c8a0e-5c1e-4a4e-9b1a-0a1b2c3d4e5f",
    });
    expect(parsed.success && parsed.data.code).toBe("JW-1");
  });

  it("enforces the unit decimal-place range from the shared schema", () => {
    const bad = createUnitSchema.safeParse({ code: "PCS", name: "Pieces", decimalPlaces: 7 });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(formErrorsFromZod(bad.error).fields.decimalPlaces).toBeDefined();
    expect(createUnitSchema.safeParse({ code: "PCS", name: "Pieces" }).success).toBe(true);
  });
});
