import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  findProcessByCode: vi.fn(),
  findProcessById: vi.fn(),
  insertProcess: vi.fn(),
  listProcesses: vi.fn(),
  updateProcess: vi.fn(),
}));
const { recordAuditLog } = vi.hoisted(() => ({ recordAuditLog: vi.fn() }));
const tx = vi.hoisted(() => ({ tx: true }));

vi.mock("./processes.repository.js", () => repo);
vi.mock("../../lib/audit.js", () => ({ recordAuditLog }));
vi.mock("../../db/client.js", () => ({
  db: { transaction: (fn: (t: unknown) => unknown) => fn(tx) },
}));

const {
  createProcess,
  getProcessById,
  listProcessesPage,
  updateProcessDetails,
} = await import("./processes.service.js");

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
  description: null,
};
const input = { code: "TEST", name: "Test" };
describe("processes service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it("stamps creator and audits in the mutation transaction", async () => {
    repo.findProcessByCode.mockResolvedValue([]);
    repo.insertProcess.mockResolvedValue([row]);
    expect(await createProcess(input, actor)).toBe(row);
    expect(repo.insertProcess).toHaveBeenCalledWith(
      { ...input, createdBy: actor.actorUserId, updatedBy: actor.actorUserId },
      tx,
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "process.created",
        entityId: row.id,
        userId: actor.actorUserId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      }),
      tx,
    );
  });
  it("returns 404 for missing records", async () => {
    repo.findProcessById.mockResolvedValue([]);
    await expect(getProcessById("missing")).rejects.toMatchObject({
      status: 404,
    });
  });
  it("rejects duplicates before mutation and maps concurrent unique violations", async () => {
    repo.findProcessByCode.mockResolvedValue([row]);
    await expect(createProcess(input, actor)).rejects.toMatchObject({
      status: 409,
    });
    expect(repo.insertProcess).not.toHaveBeenCalled();
    repo.findProcessByCode.mockResolvedValue([]);
    for (const error of [{ code: "23505" }, { cause: { code: "23505" } }]) {
      repo.insertProcess.mockRejectedValue(error);
      await expect(createProcess(input, actor)).rejects.toMatchObject({
        status: 409,
      });
    }
  });
  it.each([
    [true, false, "deactivated"],
    [false, true, "activated"],
    [true, true, "updated"],
  ])("audits status changes %s to %s", async (before, after, action) => {
    repo.findProcessById.mockResolvedValue([{ ...row, isActive: before }]);
    repo.updateProcess.mockResolvedValue([{ ...row, isActive: after }]);
    await updateProcessDetails(row.id, { isActive: after }, actor);
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: `process.${action}` }),
      tx,
    );
  });
  it("propagates audit failures", async () => {
    repo.findProcessByCode.mockResolvedValue([]);
    repo.insertProcess.mockResolvedValue([row]);
    recordAuditLog.mockRejectedValue(new Error("audit failed"));
    await expect(createProcess(input, actor)).rejects.toThrow("audit failed");
  });
  it("passes list filters", async () => {
    await listProcessesPage({
      page: 2,
      pageSize: 10,
      search: "test",
      isActive: false,
    });
    expect(repo.listProcesses).toHaveBeenCalledWith(2, 10, {
      search: "test",
      isActive: false,
    });
  });
});
