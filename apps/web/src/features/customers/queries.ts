import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCustomerContactInput,
  CreateCustomerInput,
  UpdateCustomerContactInput,
  UpdateCustomerInput,
} from "@garment-erp/validation";
import type { ListParams } from "@/lib/types";
import {
  createCustomer,
  createCustomerContact,
  getCustomer,
  listCustomerContacts,
  listCustomers,
  updateCustomer,
  updateCustomerContact,
} from "./api";

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: ListParams) => [...customerKeys.lists(), params] as const,
  detail: (id: string) => [...customerKeys.all, "detail", id] as const,
  contacts: (id: string) => [...customerKeys.all, "detail", id, "contacts"] as const,
};

export function useCustomers(params: ListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => listCustomers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: customerKeys.detail(id), queryFn: () => getCustomer(id) });
}

export function useCustomerContacts(customerId: string) {
  return useQuery({
    queryKey: customerKeys.contacts(customerId),
    queryFn: () => listCustomerContacts(customerId),
    select: (data) => data.items,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
      updateCustomer(id, data),
    onSuccess: (customer) => {
      queryClient.setQueryData(customerKeys.detail(customer.id), customer);
      return queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useCreateCustomerContact(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerContactInput) => createCustomerContact(customerId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.contacts(customerId) }),
  });
}

export function useUpdateCustomerContact(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerContactInput }) =>
      updateCustomerContact(customerId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.contacts(customerId) }),
  });
}
