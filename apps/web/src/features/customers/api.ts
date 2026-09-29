import type {
  CreateCustomerContactInput,
  CreateCustomerInput,
  UpdateCustomerContactInput,
  UpdateCustomerInput,
} from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { ListParams, Paginated } from "@/lib/types";
import type { Customer, CustomerContact } from "./types";

export function listCustomers(params: ListParams) {
  return apiFetch<Paginated<Customer>>(`/api/customers${buildQuery({ ...params })}`);
}

export function getCustomer(id: string) {
  return apiFetch<Customer>(`/api/customers/${id}`);
}

export function createCustomer(input: CreateCustomerInput) {
  return apiFetch<Customer>("/api/customers", { method: "POST", ...jsonBody(input) });
}

export function updateCustomer(id: string, input: UpdateCustomerInput) {
  return apiFetch<Customer>(`/api/customers/${id}`, { method: "PATCH", ...jsonBody(input) });
}

export function listCustomerContacts(customerId: string) {
  return apiFetch<{ items: CustomerContact[] }>(`/api/customers/${customerId}/contacts`);
}

export function createCustomerContact(customerId: string, input: CreateCustomerContactInput) {
  return apiFetch<CustomerContact>(`/api/customers/${customerId}/contacts`, {
    method: "POST",
    ...jsonBody(input),
  });
}

export function updateCustomerContact(
  customerId: string,
  contactId: string,
  input: UpdateCustomerContactInput
) {
  return apiFetch<CustomerContact>(`/api/customers/${customerId}/contacts/${contactId}`, {
    method: "PATCH",
    ...jsonBody(input),
  });
}
