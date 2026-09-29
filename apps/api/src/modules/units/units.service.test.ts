import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  findUnitByCode: vi.fn(),
  findUnitById: vi.fn(),
  insertUnit: vi.fn(),
  listUnits: vi.fn(),
  updateUnit: vi.fn(),
}));
const { recordAuditLog } = vi.hoisted(() => ({ recordAuditLog: vi.fn() }));
const tx = vi.hoisted(() => ({ tx: true }));

vi.mock("./units.repository.js", () => repo);
vi.mock("../../lib/audit.js", () => ({ recordAuditLog }));
vi.mock("../../db/client.js", () => ({
  db: { transaction: (fn: (t: unknown) => unknown) => fn(tx) },
}));

const { createUnit, getUnitById, listUnitsPage, updateUnitDetails } =
  await import("./units.service.js");

const actor = {
  actorUserId: "user-1",
  ipAddress: "10.0.0.1",
  userAgent: "vitest",
};

const row = {
  id: "master-1",
  code: "TEST",
  name: "Test",
  isActive: true,
  decimalPlaces: 0,
  symbol: null,
};
const input = { code: "TEST", name: "Test", decimalPlaces: 0 };
describe("units service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it("stamps creator and audits in the mutation transaction", async () => {
    repo.findUnitByCode.mockResolvedValue([]);
    repo.insertUnit.mockResolvedValue([row]);
    expect(await createUnit(input, actor)).toBe(row);
    expect(repo.insertUnit).toHaveBeenCalledWith(
      { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
      tx,
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "unit.created",
        entityId: row.id,
        userId: actor.actorUserId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      }),
      tx,
    );
  });
  it("returns 404 for missing records", async () => {
    repo.findUnitById.mockResolvedValue([]);
    await expect(getUnitById("missing")).rejects.toMatchObject({ status: 404 });
  });
  it("rejects duplicates before mutation and maps concurrent unique violations", async () => {
    repo.findUnitByCode.mockResolvedValue([row]);
    await expect(createUnit(input, actor)).rejects.toMatchObject({
      status: 409,
    });
    expect(repo.insertUnit).not.toHaveBeenCalled();
    repo.findUnitByCode.mockResolvedValue([]);
    for (const error of [{ code: "23505" }, { cause: { code: "23505" } }]) {
      repo.insertUnit.mockRejectedValue(error);
      await expect(createUnit(input, actor)).rejects.toMatchObject({
        status: 409,
      });
    }
  });
  it.each([
    [true, false, "deactivated"],
    [false, true, "activated"],
    [true, true, "updated"],
  ])("audits status changes %s to %s", async (before, after, action) => {
    repo.findUnitById.mockResolvedValue([{ ...row, isActive: before }]);
    repo.updateUnit.mockResolvedValue([{ ...row, isActive: after }]);
    await updateUnitDetails(row.id, { isActive: after }, actor);
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: `unit.${action}` }),
      tx,
    );
  });
  it("propagates audit failures", async () => {
    repo.findUnitByCode.mockResolvedValue([]);
    repo.insertUnit.mockResolvedValue([row]);
    recordAuditLog.mockRejectedValue(new Error("audit failed"));
    await expect(createUnit(input, actor)).rejects.toThrow("audit failed");
  });
  it("passes list filters", async () => {
    await listUnitsPage({
      page: 2,
      pageSize: 10,
      search: "test",
      isActive: false,
    });
    expect(repo.listUnits).toHaveBeenCalledWith(2, 10, {
      search: "test",
      isActive: false,
    });
  });
});
