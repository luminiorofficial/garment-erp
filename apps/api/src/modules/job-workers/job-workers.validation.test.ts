import { describe, expect, it } from "vitest";
import {
  createJobWorkerSchema,
  listJobWorkersQuerySchema,
  updateJobWorkerSchema,
} from "@garment-erp/validation";

const base = { code: "JW-001", name: "Stitchwell" };

describe("job worker validation contracts", () => {
  it("trims and uppercases the code and trims the name", () => {
    const parsed = createJobWorkerSchema.parse({
      code: "  jw-001 ",
      name: "  Stitchwell  ",
    });
    expect(parsed.code).toBe("JW-001");
    expect(parsed.name).toBe("Stitchwell");
  });

  it("rejects codes with disallowed characters or out-of-range length", () => {
    expect(
      createJobWorkerSchema.safeParse({ ...base, code: "JW 01" }).success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...base, code: "-JW" }).success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...base, code: "J" }).success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...base, code: "J".repeat(31) })
        .success,
    ).toBe(false);
  });

  it("requires code and name on create", () => {
    expect(createJobWorkerSchema.safeParse({ name: "X" }).success).toBe(false);
    expect(createJobWorkerSchema.safeParse({ code: "JW-001" }).success).toBe(
      false,
    );
    expect(
      createJobWorkerSchema.safeParse({ code: "JW-001", name: "   " }).success,
    ).toBe(false);
  });

  it("normalizes email to lowercase and rejects invalid emails", () => {
    const parsed = createJobWorkerSchema.parse({
      ...base,
      email: " Ravi@Stitchwell.Example ",
    });
    expect(parsed.email).toBe("ravi@stitchwell.example");
    expect(
      createJobWorkerSchema.safeParse({ ...base, email: "nope" }).success,
    ).toBe(false);
  });

  it("requires UUID references and rejects legacy fields", () => {
    expect(
      createJobWorkerSchema.safeParse({ ...base, processId: "STITCHING" })
        .success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...base, process: "STITCHING" })
        .success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({
        ...base,
        capacityUnit: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(false);
    expect(
      listJobWorkersQuerySchema.safeParse({ process: "STITCHING" }).success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({
        ...base,
        processId: null,
        capacityPerDay: null,
        capacityUnitId: null,
      }).success,
    ).toBe(true);
  });

  it("accepts capacity only as a positive whole number", () => {
    const withUnit = {
      ...base,
      capacityUnitId: "11111111-1111-4111-8111-111111111111",
    };
    expect(
      createJobWorkerSchema.safeParse({ ...withUnit, capacityPerDay: 1200 })
        .success,
    ).toBe(true);
    expect(
      createJobWorkerSchema.safeParse({ ...withUnit, capacityPerDay: -1 })
        .success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...withUnit, capacityPerDay: 0 })
        .success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...withUnit, capacityPerDay: 2.5 })
        .success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...withUnit, capacityPerDay: NaN })
        .success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...withUnit, capacityPerDay: "10" })
        .success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({
        ...withUnit,
        capacityPerDay: 1_000_001,
      }).success,
    ).toBe(false);
  });

  it("requires capacityPerDay and capacityUnitId together on create", () => {
    expect(
      createJobWorkerSchema.safeParse({ ...base, capacityPerDay: 100 }).success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({
        ...base,
        capacityUnitId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(false);
  });

  it("accepts lead time as a non-negative integer only", () => {
    expect(
      createJobWorkerSchema.safeParse({ ...base, leadTimeDays: 0 }).success,
    ).toBe(true);
    expect(
      createJobWorkerSchema.safeParse({ ...base, leadTimeDays: -1 }).success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...base, leadTimeDays: 2.5 }).success,
    ).toBe(false);
    expect(
      createJobWorkerSchema.safeParse({ ...base, leadTimeDays: 366 }).success,
    ).toBe(false);
  });

  it("allows clearing optional fields with null on update", () => {
    const parsed = updateJobWorkerSchema.parse({
      processId: null,
      capacityPerDay: null,
      capacityUnitId: null,
      leadTimeDays: null,
    });
    expect(parsed).toEqual({
      processId: null,
      capacityPerDay: null,
      capacityUnitId: null,
      leadTimeDays: null,
    });
  });

  it("rejects an empty PATCH payload and negative values on update", () => {
    expect(updateJobWorkerSchema.safeParse({}).success).toBe(false);
    expect(
      updateJobWorkerSchema.safeParse({ capacityPerDay: -5 }).success,
    ).toBe(false);
    expect(updateJobWorkerSchema.safeParse({ leadTimeDays: -3 }).success).toBe(
      false,
    );
  });

  it("parses list filters from query-string values", () => {
    const parsed = listJobWorkersQuerySchema.parse({
      page: "2",
      pageSize: "10",
      isActive: "false",
      search: " stitch ",
      processId: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed).toEqual({
      page: 2,
      pageSize: 10,
      isActive: false,
      search: "stitch",
      processId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("parses isActive=true and rejects other isActive values", () => {
    expect(listJobWorkersQuerySchema.parse({ isActive: "true" }).isActive).toBe(
      true,
    );
    expect(
      listJobWorkersQuerySchema.safeParse({ isActive: "yes" }).success,
    ).toBe(false);
  });
});
