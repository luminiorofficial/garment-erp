import { describe, expect, it } from "vitest";
import { createStyleSchema } from "@garment-erp/validation";
import { formErrorsFromZod } from "./forms";
import { labelFor, referenceOptions } from "./reference-options";

const items = [
  { id: "a", code: "A", isActive: true },
  { id: "b", code: "B", isActive: false },
  { id: "c", code: "C", isActive: false },
];
const label = (i: (typeof items)[number]) => i.code;

describe("referenceOptions", () => {
  it("offers only active masters for new assignments", () => {
    expect(referenceOptions(items, null, label).map((o) => o.value)).toEqual(["a"]);
  });

  it("keeps an inactive master the record already holds, labelled inactive", () => {
    expect(referenceOptions(items, "b", label)).toEqual([
      { value: "a", label: "A" },
      { value: "b", label: "B (inactive)" },
    ]);
    expect(referenceOptions(items, ["b", "c"], label).map((o) => o.value)).toEqual(["a", "b", "c"]);
  });

  it("returns nothing while a lookup has not loaded", () => {
    expect(referenceOptions(undefined, "a", label)).toEqual([]);
  });
});

describe("labelFor", () => {
  it("resolves known ids and never invents a label for unknown ones", () => {
    expect(labelFor(items, "a", label)).toBe("A");
    expect(labelFor(items, "zzz", label)).toBeNull();
    expect(labelFor(undefined, "a", label)).toBeNull();
    expect(labelFor(items, null, label)).toBeNull();
  });
});

describe("style form validation", () => {
  it("requires a product and reports it on the productId field", () => {
    const parsed = createStyleSchema.safeParse({ code: "ST-1", name: "Polo", productId: undefined });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(formErrorsFromZod(parsed.error).fields.productId).toBeDefined();
  });
});
