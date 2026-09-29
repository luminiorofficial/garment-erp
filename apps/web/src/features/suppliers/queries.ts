import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSupplierContactInput,
  CreateSupplierInput,
  UpdateSupplierContactInput,
  UpdateSupplierInput,
} from "@garment-erp/validation";
import type { ListParams } from "@/lib/types";
import {
  createSupplier,
  createSupplierContact,
  getSupplier,
  listSupplierContacts,
  listSuppliers,
  updateSupplier,
  updateSupplierContact,
} from "./api";

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params: ListParams) => [...supplierKeys.lists(), params] as const,
  detail: (id: string) => [...supplierKeys.all, "detail", id] as const,
  contacts: (id: string) => [...supplierKeys.all, "detail", id, "contacts"] as const,
};

export function useSuppliers(params: ListParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => listSuppliers(params),
    placeholderData: keepPreviousData,
  });
}

export function useSupplier(id: string) {
  return useQuery({ queryKey: supplierKeys.detail(id), queryFn: () => getSupplier(id) });
}

export function useSupplierContacts(supplierId: string) {
  return useQuery({
    queryKey: supplierKeys.contacts(supplierId),
    queryFn: () => listSupplierContacts(supplierId),
    select: (data) => data.items,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => createSupplier(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.lists() }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInput }) =>
      updateSupplier(id, data),
    onSuccess: (supplier) => {
      queryClient.setQueryData(supplierKeys.detail(supplier.id), supplier);
      return queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useCreateSupplierContact(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierContactInput) => createSupplierContact(supplierId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.contacts(supplierId) }),
  });
}

export function useUpdateSupplierContact(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierContactInput }) =>
      updateSupplierContact(supplierId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.contacts(supplierId) }),
  });
}
