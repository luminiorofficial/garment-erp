import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api-error.js";

const repo = vi.hoisted(() => ({
  clearPrimaryContact: vi.fn(),
  findContactById: vi.fn(),
  findSupplierByCode: vi.fn(),
  findSupplierById: vi.fn(),
  insertContact: vi.fn(),
  insertSupplier: vi.fn(),
  listContactsForSupplier: vi.fn(),
  listSuppliers: vi.fn(),
  updateContact: vi.fn(),
  updateSupplier: vi.fn(),
}));
const { recordAuditLog } = vi.hoisted(() => ({ recordAuditLog: vi.fn() }));
const tx = vi.hoisted(() => ({ tx: true }));

vi.mock("./suppliers.repository.js", () => repo);
vi.mock("../../lib/audit.js", () => ({ recordAuditLog }));
vi.mock("../../db/client.js", () => ({
  db: { transaction: (fn: (t: unknown) => unknown) => fn(tx) },
}));

const {
  createSupplier,
  createSupplierContact,
  getContactsForSupplier,
  updateSupplierContact,
  updateSupplierDetails,
} = await import("./suppliers.service.js");

const actor = { actorUserId: "user-1", ipAddress: "10.0.0.1", userAgent: "vitest" };

const existingSupplier = {
  id: "sup-1",
  code: "FABCO",
  name: "Fabco Mills",
  billingAddress: null,
  shippingAddress: null,
  paymentTerms: null,
  leadTimeDays: 14,
  rating: 4,
  taxInformation: null,
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "user-1",
  updatedBy: "user-1",
};

describe("suppliers.service", () => {
  beforeEach(() => {
    for (const fn of Object.values(repo)) fn.mockReset();
    recordAuditLog.mockReset();
  });

  describe("createSupplier", () => {
    it("inserts with createdBy/updatedBy and writes a supplier.created audit entry", async () => {
      repo.findSupplierByCode.mockResolvedValue([]);
      repo.insertSupplier.mockResolvedValue([existingSupplier]);

      const created = await createSupplier(
        { code: "FABCO", name: "Fabco Mills", leadTimeDays: 14, rating: 4 },
        actor
      );

      expect(created).toBe(existingSupplier);
      expect(repo.insertSupplier).toHaveBeenCalledWith(
        {
          code: "FABCO",
          name: "Fabco Mills",
          leadTimeDays: 14,
          rating: 4,
          createdBy: "user-1",
          updatedBy: "user-1",
        },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "supplier.created",
          entityType: "supplier",
          entityId: "sup-1",
          newValue: { code: "FABCO", name: "Fabco Mills" },
        }),
        tx
      );
    });

    it("throws 409 when the code already exists", async () => {
      repo.findSupplierByCode.mockResolvedValue([existingSupplier]);

      const error = await createSupplier({ code: "FABCO", name: "Dup" }, actor).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
      expect(repo.insertSupplier).not.toHaveBeenCalled();
    });

    it("maps a unique-constraint race (pg 23505) to 409", async () => {
      repo.findSupplierByCode.mockResolvedValue([]);
      repo.insertSupplier.mockRejectedValue(
        Object.assign(new Error("Failed query"), { cause: { code: "23505" } })
      );

      const error = await createSupplier({ code: "FABCO", name: "Race" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(409);
    });
  });

  describe("updateSupplierDetails", () => {
    it("records supplier.deactivated with only the changed fields", async () => {
      repo.findSupplierById.mockResolvedValue([existingSupplier]);
      repo.updateSupplier.mockResolvedValue([{ ...existingSupplier, isActive: false }]);

      await updateSupplierDetails("sup-1", { isActive: false }, actor);

      expect(repo.updateSupplier).toHaveBeenCalledWith(
        "sup-1",
        { isActive: false, updatedBy: "user-1" },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "supplier.deactivated",
          oldValue: { isActive: true },
          newValue: { isActive: false },
        }),
        tx
      );
    });

    it("records supplier.activated when reactivating", async () => {
      repo.findSupplierById.mockResolvedValue([{ ...existingSupplier, isActive: false }]);
      repo.updateSupplier.mockResolvedValue([existingSupplier]);

      await updateSupplierDetails("sup-1", { isActive: true }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "supplier.activated" }),
        tx
      );
    });

    it("records supplier.updated with lead time and rating diffs", async () => {
      repo.findSupplierById.mockResolvedValue([existingSupplier]);
      repo.updateSupplier.mockResolvedValue([
        { ...existingSupplier, leadTimeDays: 21, rating: null },
      ]);

      await updateSupplierDetails("sup-1", { leadTimeDays: 21, rating: null }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "supplier.updated",
          oldValue: { leadTimeDays: 14, rating: 4 },
          newValue: { leadTimeDays: 21, rating: null },
        }),
        tx
      );
    });

    it("throws 409 when changing the code to one another supplier uses", async () => {
      repo.findSupplierById.mockResolvedValue([existingSupplier]);
      repo.findSupplierByCode.mockResolvedValue([{ ...existingSupplier, id: "sup-2" }]);

      const error = await updateSupplierDetails("sup-1", { code: "TAKEN" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(409);
      expect(repo.updateSupplier).not.toHaveBeenCalled();
    });

    it("does not look up the code when it is unchanged", async () => {
      repo.findSupplierById.mockResolvedValue([existingSupplier]);
      repo.updateSupplier.mockResolvedValue([existingSupplier]);

      await updateSupplierDetails("sup-1", { code: "FABCO" }, actor);

      expect(repo.findSupplierByCode).not.toHaveBeenCalled();
    });

    it("throws 404 for an unknown supplier", async () => {
      repo.findSupplierById.mockResolvedValue([]);

      const error = await updateSupplierDetails("missing", { name: "X" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(404);
    });
  });

  describe("contacts", () => {
    const contact = {
      id: "contact-1",
      supplierId: "sup-1",
      name: "Anil",
      designation: null,
      email: null,
      phone: null,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("clears the existing primary before creating a new primary contact, and audits it", async () => {
      repo.findSupplierById.mockResolvedValue([existingSupplier]);
      repo.insertContact.mockResolvedValue([contact]);

      await createSupplierContact("sup-1", { name: "Anil", isPrimary: true }, actor);

      expect(repo.clearPrimaryContact).toHaveBeenCalledWith("sup-1", tx);
      expect(repo.insertContact).toHaveBeenCalledWith(
        { name: "Anil", isPrimary: true, supplierId: "sup-1" },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "supplier_contact.created",
          entityType: "supplier_contact",
          entityId: "contact-1",
        }),
        tx
      );
    });

    it("does not clear the primary when creating a non-primary contact", async () => {
      repo.findSupplierById.mockResolvedValue([existingSupplier]);
      repo.insertContact.mockResolvedValue([{ ...contact, isPrimary: false }]);

      await createSupplierContact("sup-1", { name: "Anil" }, actor);

      expect(repo.clearPrimaryContact).not.toHaveBeenCalled();
    });

    it("rejects creating a contact for an unknown supplier with 404", async () => {
      repo.findSupplierById.mockResolvedValue([]);

      const error = await createSupplierContact("missing", { name: "X" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(404);
      expect(repo.insertContact).not.toHaveBeenCalled();
    });

    it("rejects listing contacts for an unknown supplier with 404", async () => {
      repo.findSupplierById.mockResolvedValue([]);

      const error = await getContactsForSupplier("missing").catch((e) => e);

      expect((error as ApiError).status).toBe(404);
      expect(repo.listContactsForSupplier).not.toHaveBeenCalled();
    });

    it("clears the previous primary when promoting a contact to primary", async () => {
      repo.findContactById.mockResolvedValue([{ ...contact, isPrimary: false }]);
      repo.updateContact.mockResolvedValue([contact]);

      await updateSupplierContact("sup-1", "contact-1", { isPrimary: true }, actor);

      expect(repo.clearPrimaryContact).toHaveBeenCalledWith("sup-1", tx);
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "supplier_contact.updated",
          oldValue: { isPrimary: false },
          newValue: { isPrimary: true },
        }),
        tx
      );
    });

    it("returns 404 when the contact does not belong to the supplier", async () => {
      repo.findContactById.mockResolvedValue([]);

      const error = await updateSupplierContact("sup-2", "contact-1", { name: "X" }, actor).catch(
        (e) => e
      );

      expect((error as ApiError).status).toBe(404);
    });
  });
});
