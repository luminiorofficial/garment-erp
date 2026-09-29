import type {
  CreateSupplierContactInput,
  CreateSupplierInput,
  UpdateSupplierContactInput,
  UpdateSupplierInput,
} from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { ListParams, Paginated } from "@/lib/types";
import type { Supplier, SupplierContact } from "./types";

export function listSuppliers(params: ListParams) {
  return apiFetch<Paginated<Supplier>>(`/api/suppliers${buildQuery({ ...params })}`);
}

export function getSupplier(id: string) {
  return apiFetch<Supplier>(`/api/suppliers/${id}`);
}

export function createSupplier(input: CreateSupplierInput) {
  return apiFetch<Supplier>("/api/suppliers", { method: "POST", ...jsonBody(input) });
}

export function updateSupplier(id: string, input: UpdateSupplierInput) {
  return apiFetch<Supplier>(`/api/suppliers/${id}`, { method: "PATCH", ...jsonBody(input) });
}

export function listSupplierContacts(supplierId: string) {
  return apiFetch<{ items: SupplierContact[] }>(`/api/suppliers/${supplierId}/contacts`);
}

export function createSupplierContact(supplierId: string, input: CreateSupplierContactInput) {
  return apiFetch<SupplierContact>(`/api/suppliers/${supplierId}/contacts`, {
    method: "POST",
    ...jsonBody(input),
  });
}

export function updateSupplierContact(
  supplierId: string,
  contactId: string,
  input: UpdateSupplierContactInput
) {
  return apiFetch<SupplierContact>(`/api/suppliers/${supplierId}/contacts/${contactId}`, {
    method: "PATCH",
    ...jsonBody(input),
  });
}
