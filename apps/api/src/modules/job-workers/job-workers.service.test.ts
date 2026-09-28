import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api-error.js";

const repo = vi.hoisted(() => ({
  findJobWorkerByCode: vi.fn(),
  findJobWorkerById: vi.fn(),
  insertJobWorker: vi.fn(),
  listJobWorkers: vi.fn(),
  updateJobWorker: vi.fn(),
}));
const { recordAuditLog } = vi.hoisted(() => ({ recordAuditLog: vi.fn() }));
const tx = vi.hoisted(() => ({ tx: true }));

vi.mock("./job-workers.repository.js", () => repo);
vi.mock("../../lib/audit.js", () => ({ recordAuditLog }));
vi.mock("../../db/client.js", () => ({
  db: { transaction: (fn: (t: unknown) => unknown) => fn(tx) },
}));

const { createJobWorker, getJobWorkerById, listJobWorkersPage, updateJobWorkerDetails } =
  await import("./job-workers.service.js");

const actor = { actorUserId: "user-1", ipAddress: "10.0.0.1", userAgent: "vitest" };

const existingJobWorker = {
  id: "jw-1",
  code: "JW-001",
  name: "Stitchwell Works",
  contactPerson: "Ravi",
  email: null,
  phone: null,
  billingAddress: null,
  operatingAddress: null,
  process: "STITCHING",
  capacityPerDay: 1200,
  capacityUnit: "PCS",
  leadTimeDays: 7,
  rateAgreement: "₹18 / piece",
  paymentTerms: null,
  taxInformation: null,
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "user-1",
  updatedBy: "user-1",
};

describe("job-workers.service", () => {
  beforeEach(() => {
    for (const fn of Object.values(repo)) fn.mockReset();
    recordAuditLog.mockReset();
  });

  describe("listJobWorkersPage", () => {
    it("passes pagination and all filters to the repository", async () => {
      repo.listJobWorkers.mockResolvedValue([]);

      await listJobWorkersPage({
        page: 2,
        pageSize: 10,
        search: "stitch",
        isActive: true,
        process: "STITCHING",
      });

      expect(repo.listJobWorkers).toHaveBeenCalledWith(2, 10, {
        search: "stitch",
        isActive: true,
        process: "STITCHING",
      });
    });
  });

  describe("getJobWorkerById", () => {
    it("throws 404 for an unknown job worker", async () => {
      repo.findJobWorkerById.mockResolvedValue([]);

      const error = await getJobWorkerById("missing").catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
    });
  });

  describe("createJobWorker", () => {
    it("inserts with createdBy/updatedBy and writes a job_worker.created audit entry", async () => {
      repo.findJobWorkerByCode.mockResolvedValue([]);
      repo.insertJobWorker.mockResolvedValue([existingJobWorker]);

      const created = await createJobWorker(
        {
          code: "JW-001",
          name: "Stitchwell Works",
          process: "STITCHING",
          capacityPerDay: 1200,
          capacityUnit: "PCS",
        },
        actor
      );

      expect(created).toBe(existingJobWorker);
      expect(repo.insertJobWorker).toHaveBeenCalledWith(
        {
          code: "JW-001",
          name: "Stitchwell Works",
          process: "STITCHING",
          capacityPerDay: 1200,
          capacityUnit: "PCS",
          createdBy: "user-1",
          updatedBy: "user-1",
        },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        {
          userId: "user-1",
          action: "job_worker.created",
          entityType: "job_worker",
          entityId: "jw-1",
          newValue: { code: "JW-001", name: "Stitchwell Works", process: "STITCHING" },
          ipAddress: "10.0.0.1",
          userAgent: "vitest",
        },
        tx
      );
    });

    it("throws 409 when the code already exists", async () => {
      repo.findJobWorkerByCode.mockResolvedValue([existingJobWorker]);

      const error = await createJobWorker({ code: "JW-001", name: "Dup" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(409);
      expect(repo.insertJobWorker).not.toHaveBeenCalled();
      expect(recordAuditLog).not.toHaveBeenCalled();
    });

    it("maps a unique-constraint race (pg 23505) to 409", async () => {
      repo.findJobWorkerByCode.mockResolvedValue([]);
      repo.insertJobWorker.mockRejectedValue(
        Object.assign(new Error("Failed query"), { cause: { code: "23505" } })
      );

      const error = await createJobWorker({ code: "JW-001", name: "Race" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(409);
    });

    it("rethrows non-unique database errors unchanged", async () => {
      repo.findJobWorkerByCode.mockResolvedValue([]);
      const dbError = Object.assign(new Error("Failed query"), { cause: { code: "23514" } });
      repo.insertJobWorker.mockRejectedValue(dbError);

      const error = await createJobWorker({ code: "JW-001", name: "X" }, actor).catch((e) => e);

      expect(error).toBe(dbError);
    });
  });

  describe("updateJobWorkerDetails", () => {
    it("updates with updatedBy and records job_worker.updated with only the changed fields", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([
        { ...existingJobWorker, name: "Stitchwell Works Pvt Ltd" },
      ]);

      await updateJobWorkerDetails("jw-1", { name: "Stitchwell Works Pvt Ltd" }, actor);

      expect(repo.updateJobWorker).toHaveBeenCalledWith(
        "jw-1",
        { name: "Stitchwell Works Pvt Ltd", updatedBy: "user-1" },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        {
          userId: "user-1",
          action: "job_worker.updated",
          entityType: "job_worker",
          entityId: "jw-1",
          oldValue: { name: "Stitchwell Works" },
          newValue: { name: "Stitchwell Works Pvt Ltd" },
          ipAddress: "10.0.0.1",
          userAgent: "vitest",
        },
        tx
      );
    });

    it("records capacity changes in the audit diff", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([
        { ...existingJobWorker, capacityPerDay: 500, capacityUnit: "KG" },
      ]);

      await updateJobWorkerDetails("jw-1", { capacityPerDay: 500, capacityUnit: "KG" }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "job_worker.updated",
          oldValue: { capacityPerDay: 1200, capacityUnit: "PCS" },
          newValue: { capacityPerDay: 500, capacityUnit: "KG" },
        }),
        tx
      );
    });

    it("records lead-time changes in the audit diff", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([{ ...existingJobWorker, leadTimeDays: null }]);

      await updateJobWorkerDetails("jw-1", { leadTimeDays: null }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValue: { leadTimeDays: 7 },
          newValue: { leadTimeDays: null },
        }),
        tx
      );
    });

    it("records process changes in the audit diff", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([{ ...existingJobWorker, process: "EMBROIDERY" }]);

      await updateJobWorkerDetails("jw-1", { process: "EMBROIDERY" }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValue: { process: "STITCHING" },
          newValue: { process: "EMBROIDERY" },
        }),
        tx
      );
    });

    it("allows changing capacity alone when the stored row already has a unit", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([{ ...existingJobWorker, capacityPerDay: 900 }]);

      await updateJobWorkerDetails("jw-1", { capacityPerDay: 900 }, actor);

      expect(repo.updateJobWorker).toHaveBeenCalled();
    });

    it("allows clearing capacity and unit together", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([
        { ...existingJobWorker, capacityPerDay: null, capacityUnit: null },
      ]);

      await updateJobWorkerDetails("jw-1", { capacityPerDay: null, capacityUnit: null }, actor);

      expect(repo.updateJobWorker).toHaveBeenCalled();
    });

    it("rejects clearing only the capacity unit with 422", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);

      const error = await updateJobWorkerDetails("jw-1", { capacityUnit: null }, actor).catch(
        (e) => e
      );

      expect((error as ApiError).status).toBe(422);
      expect(repo.updateJobWorker).not.toHaveBeenCalled();
    });

    it("rejects setting capacity without a unit when none is stored, with 422", async () => {
      repo.findJobWorkerById.mockResolvedValue([
        { ...existingJobWorker, capacityPerDay: null, capacityUnit: null },
      ]);

      const error = await updateJobWorkerDetails("jw-1", { capacityPerDay: 100 }, actor).catch(
        (e) => e
      );

      expect((error as ApiError).status).toBe(422);
      expect(repo.updateJobWorker).not.toHaveBeenCalled();
    });

    it("records job_worker.deactivated with only the isActive change", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([{ ...existingJobWorker, isActive: false }]);

      await updateJobWorkerDetails("jw-1", { isActive: false }, actor);

      expect(repo.updateJobWorker).toHaveBeenCalledWith(
        "jw-1",
        { isActive: false, updatedBy: "user-1" },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "job_worker.deactivated",
          oldValue: { isActive: true },
          newValue: { isActive: false },
        }),
        tx
      );
    });

    it("records job_worker.activated when reactivating", async () => {
      repo.findJobWorkerById.mockResolvedValue([{ ...existingJobWorker, isActive: false }]);
      repo.updateJobWorker.mockResolvedValue([existingJobWorker]);

      await updateJobWorkerDetails("jw-1", { isActive: true }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "job_worker.activated",
          oldValue: { isActive: false },
          newValue: { isActive: true },
        }),
        tx
      );
    });

    it("records job_worker.updated when isActive is sent but unchanged", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([existingJobWorker]);

      await updateJobWorkerDetails("jw-1", { isActive: true }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "job_worker.updated" }),
        tx
      );
    });

    it("throws 409 when changing the code to one another job worker uses", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.findJobWorkerByCode.mockResolvedValue([{ ...existingJobWorker, id: "jw-2" }]);

      const error = await updateJobWorkerDetails("jw-1", { code: "TAKEN" }, actor).catch(
        (e) => e
      );

      expect((error as ApiError).status).toBe(409);
      expect(repo.updateJobWorker).not.toHaveBeenCalled();
    });

    it("maps a unique-constraint race on update (pg 23505) to 409", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.findJobWorkerByCode.mockResolvedValue([]);
      repo.updateJobWorker.mockRejectedValue({ code: "23505" });

      const error = await updateJobWorkerDetails("jw-1", { code: "JW-002" }, actor).catch(
        (e) => e
      );

      expect((error as ApiError).status).toBe(409);
    });

    it("does not look up the code when it is unchanged", async () => {
      repo.findJobWorkerById.mockResolvedValue([existingJobWorker]);
      repo.updateJobWorker.mockResolvedValue([existingJobWorker]);

      await updateJobWorkerDetails("jw-1", { code: "JW-001" }, actor);

      expect(repo.findJobWorkerByCode).not.toHaveBeenCalled();
    });

    it("throws 404 for an unknown job worker", async () => {
      repo.findJobWorkerById.mockResolvedValue([]);

      const error = await updateJobWorkerDetails("missing", { name: "X" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(404);
      expect(repo.updateJobWorker).not.toHaveBeenCalled();
    });
  });
});
