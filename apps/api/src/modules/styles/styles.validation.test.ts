import { describe, expect, it } from "vitest";
import {
  createColorSchema,
  createProductSchema,
  createSizeSchema,
  createStyleSchema,
  createStyleVersionSchema,
  listStylesQuerySchema,
  updateSizeSchema,
  updateStyleSchema,
} from "@garment-erp/validation";

const uuid = "3f0c8a0e-5c1e-4a4e-9b1a-0a1b2c3d4e5f";
const uuid2 = "4f0c8a0e-5c1e-4a4e-9b1a-0a1b2c3d4e5f";

describe("size / color / product validation", () => {
  it("normalises codes and validates sequence", () => {
    expect(createSizeSchema.parse({ code: " xl ", name: "XL", sequence: 4 }).code).toBe("XL");
    for (const sequence of [-1, 1.5, 10_001])
      expect(createSizeSchema.safeParse({ code: "M", name: "M", sequence }).success).toBe(false);
    expect(createSizeSchema.safeParse({ code: "M", name: "M" }).success).toBe(false);
    expect(updateSizeSchema.safeParse({}).success).toBe(false);
    expect(updateSizeSchema.safeParse({ sequence: 3 }).success).toBe(true);
  });

  it("uppercases and checks hex values, rejects unknown keys", () => {
    expect(createColorSchema.parse({ code: "nvy", name: "Navy", hexValue: "#1a2b3c" }).hexValue).toBe("#1A2B3C");
    expect(createColorSchema.safeParse({ code: "NVY", name: "Navy", hexValue: "navy" }).success).toBe(false);
    expect(createColorSchema.safeParse({ code: "NVY", name: "Navy", shade: "x" }).success).toBe(false);
  });

  it("requires a category on products", () => {
    expect(createProductSchema.safeParse({ code: "TS-01", name: "Tee" }).success).toBe(false);
    expect(createProductSchema.safeParse({ code: "TS-01", name: "Tee", category: "Tops" }).success).toBe(true);
  });
});

describe("style validation", () => {
  const base = { code: "st-100", name: "Polo", productId: uuid };

  it("normalises style number and requires a product id", () => {
    expect(createStyleSchema.parse(base).code).toBe("ST-100");
    expect(createStyleSchema.safeParse({ code: "ST-1", name: "x" }).success).toBe(false);
    expect(createStyleSchema.safeParse({ ...base, productId: "nope" }).success).toBe(false);
  });

  it("rejects duplicate size/color ids and empty patches", () => {
    expect(createStyleSchema.safeParse({ ...base, sizeIds: [uuid, uuid] }).success).toBe(false);
    expect(createStyleSchema.safeParse({ ...base, colorIds: [uuid, uuid2] }).success).toBe(true);
    expect(updateStyleSchema.safeParse({}).success).toBe(false);
    expect(updateStyleSchema.safeParse({ customerId: null }).success).toBe(true);
  });

  it("parses list filters", () => {
    expect(listStylesQuerySchema.parse({ productId: uuid, isActive: "false" })).toMatchObject({
      productId: uuid,
      isActive: false,
      page: 1,
    });
    expect(listStylesQuerySchema.safeParse({ productId: "x" }).success).toBe(false);
  });

  it("needs a specification or a change summary for a version", () => {
    expect(createStyleVersionSchema.safeParse({}).success).toBe(false);
    expect(createStyleVersionSchema.safeParse({ changeSummary: "Initial" }).success).toBe(true);
    expect(createStyleVersionSchema.safeParse({ specification: "x", versionNumber: 9 }).success).toBe(false);
  });
});
