import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api-error.js";

const repo = vi.hoisted(() => ({
  clearPrimaryContact: vi.fn(),
  findContactById: vi.fn(),
  findCustomerByCode: vi.fn(),
  findCustomerById: vi.fn(),
  insertContact: vi.fn(),
  insertCustomer: vi.fn(),
  listContactsForCustomer: vi.fn(),
  listCustomers: vi.fn(),
  updateContact: vi.fn(),
  updateCustomer: vi.fn(),
}));
const { recordAuditLog } = vi.hoisted(() => ({ recordAuditLog: vi.fn() }));
const tx = vi.hoisted(() => ({ tx: true }));

vi.mock("./customers.repository.js", () => repo);
vi.mock("../../lib/audit.js", () => ({ recordAuditLog }));
vi.mock("../../db/client.js", () => ({
  db: { transaction: (fn: (t: unknown) => unknown) => fn(tx) },
}));

const {
  createCustomer,
  createCustomerContact,
  updateCustomerContact,
  updateCustomerDetails,
} = await import("./customers.service.js");

const actor = { actorUserId: "user-1", ipAddress: "10.0.0.1", userAgent: "vitest" };

const existingCustomer = {
  id: "cust-1",
  code: "ACME",
  name: "Acme",
  billingAddress: null,
  shippingAddress: null,
  paymentTerms: null,
  taxInformation: null,
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "user-1",
  updatedBy: "user-1",
};

describe("customers.service", () => {
  beforeEach(() => {
    for (const fn of Object.values(repo)) fn.mockReset();
    recordAuditLog.mockReset();
  });

  describe("createCustomer", () => {
    it("inserts with createdBy/updatedBy and writes a customer.created audit entry", async () => {
      repo.findCustomerByCode.mockResolvedValue([]);
      repo.insertCustomer.mockResolvedValue([existingCustomer]);

      const created = await createCustomer({ code: "ACME", name: "Acme" }, actor);

      expect(created).toBe(existingCustomer);
      expect(repo.insertCustomer).toHaveBeenCalledWith(
        { code: "ACME", name: "Acme", createdBy: "user-1", updatedBy: "user-1" },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "customer.created",
          entityType: "customer",
          entityId: "cust-1",
          newValue: { code: "ACME", name: "Acme" },
        }),
        tx
      );
    });

    it("throws 409 when the code already exists", async () => {
      repo.findCustomerByCode.mockResolvedValue([existingCustomer]);

      const error = await createCustomer({ code: "ACME", name: "Dup" }, actor).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
      expect(repo.insertCustomer).not.toHaveBeenCalled();
    });

    it("maps a unique-constraint race (pg 23505) to 409", async () => {
      repo.findCustomerByCode.mockResolvedValue([]);
      repo.insertCustomer.mockRejectedValue(
        Object.assign(new Error("Failed query"), { cause: { code: "23505" } })
      );

      const error = await createCustomer({ code: "ACME", name: "Race" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(409);
    });
  });

  describe("updateCustomerDetails", () => {
    it("records customer.deactivated with only the changed fields", async () => {
      repo.findCustomerById.mockResolvedValue([existingCustomer]);
      repo.updateCustomer.mockResolvedValue([{ ...existingCustomer, isActive: false }]);

      await updateCustomerDetails("cust-1", { isActive: false }, actor);

      expect(repo.updateCustomer).toHaveBeenCalledWith(
        "cust-1",
        { isActive: false, updatedBy: "user-1" },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "customer.deactivated",
          oldValue: { isActive: true },
          newValue: { isActive: false },
        }),
        tx
      );
    });

    it("records customer.updated for a plain field change", async () => {
      repo.findCustomerById.mockResolvedValue([existingCustomer]);
      repo.updateCustomer.mockResolvedValue([{ ...existingCustomer, name: "Acme Ltd" }]);

      await updateCustomerDetails("cust-1", { name: "Acme Ltd" }, actor);

      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "customer.updated",
          oldValue: { name: "Acme" },
          newValue: { name: "Acme Ltd" },
        }),
        tx
      );
    });

    it("throws 409 when changing the code to one another customer uses", async () => {
      repo.findCustomerById.mockResolvedValue([existingCustomer]);
      repo.findCustomerByCode.mockResolvedValue([{ ...existingCustomer, id: "cust-2" }]);

      const error = await updateCustomerDetails("cust-1", { code: "TAKEN" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(409);
      expect(repo.updateCustomer).not.toHaveBeenCalled();
    });

    it("throws 404 for an unknown customer", async () => {
      repo.findCustomerById.mockResolvedValue([]);

      const error = await updateCustomerDetails("missing", { name: "X" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(404);
    });
  });

  describe("contacts", () => {
    const contact = {
      id: "contact-1",
      customerId: "cust-1",
      name: "Priya",
      designation: null,
      email: null,
      phone: null,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("clears the existing primary before creating a new primary contact, and audits it", async () => {
      repo.findCustomerById.mockResolvedValue([existingCustomer]);
      repo.insertContact.mockResolvedValue([contact]);

      await createCustomerContact("cust-1", { name: "Priya", isPrimary: true }, actor);

      expect(repo.clearPrimaryContact).toHaveBeenCalledWith("cust-1", tx);
      expect(repo.insertContact).toHaveBeenCalledWith(
        { name: "Priya", isPrimary: true, customerId: "cust-1" },
        tx
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "customer_contact.created",
          entityType: "customer_contact",
          entityId: "contact-1",
        }),
        tx
      );
    });

    it("rejects creating a contact for an unknown customer with 404", async () => {
      repo.findCustomerById.mockResolvedValue([]);

      const error = await createCustomerContact("missing", { name: "X" }, actor).catch((e) => e);

      expect((error as ApiError).status).toBe(404);
      expect(repo.insertContact).not.toHaveBeenCalled();
    });

    it("returns 404 when the contact does not belong to the customer", async () => {
      repo.findContactById.mockResolvedValue([]);

      const error = await updateCustomerContact("cust-2", "contact-1", { name: "X" }, actor).catch(
        (e) => e
      );

      expect((error as ApiError).status).toBe(404);
    });
  });
});
