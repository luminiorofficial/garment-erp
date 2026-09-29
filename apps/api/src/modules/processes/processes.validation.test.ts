import { describe, expect, it } from "vitest";
import {
  createProcessSchema,
  updateProcessSchema,
  listProcessesQuerySchema,
} from "@garment-erp/validation";
describe("processes validation", () => {
  it("normalizes codes and requires a valid code and name", () => {
    expect(
      createProcessSchema.parse({ code: " test-1 ", name: " Test " }),
    ).toMatchObject({ code: "TEST-1", name: "Test" });
    for (const code of ["", " ", "BAD CODE", "BAD/", "A".repeat(51)])
      expect(
        createProcessSchema.safeParse({ code, name: "Test" }).success,
      ).toBe(false);
    expect(
      createProcessSchema.safeParse({ code: "OK", name: " " }).success,
    ).toBe(false);
  });
  it("rejects empty patches and parses pagination/active filters", () => {
    expect(updateProcessSchema.safeParse({}).success).toBe(false);
    expect(updateProcessSchema.safeParse({ unknown: true }).success).toBe(
      false,
    );
    expect(
      listProcessesQuerySchema.parse({
        page: "2",
        pageSize: "10",
        isActive: "false",
      }),
    ).toMatchObject({ page: 2, pageSize: 10, isActive: false });
  });
});
