import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSizeInput, UpdateSizeInput } from "@garment-erp/validation";
import type { ListParams } from "@/lib/types";
import { createSize, listSizes, updateSize } from "./api";

export const sizeKeys = {
  all: ["sizes"] as const,
  lists: () => [...sizeKeys.all, "list"] as const,
  list: (params: ListParams) => [...sizeKeys.lists(), params] as const,
  lookup: () => [...sizeKeys.all, "lookup"] as const,
};

export function useSizes(params: ListParams) {
  return useQuery({
    queryKey: sizeKeys.list(params),
    queryFn: () => listSizes(params),
    placeholderData: keepPreviousData,
  });
}

// Largest page the API allows (paginationQuerySchema). The API orders by sequence.
const LOOKUP_PAGE_SIZE = 200;

/** All sizes (active and inactive), in sequence order, for selectors and labels. */
export function useSizeLookup(enabled: boolean) {
  return useQuery({
    queryKey: sizeKeys.lookup(),
    queryFn: () => listSizes({ page: 1, pageSize: LOOKUP_PAGE_SIZE }),
    select: (data) => data.items,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSizeInput) => createSize(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sizeKeys.all }),
  });
}

export function useUpdateSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSizeInput }) => updateSize(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sizeKeys.all }),
  });
}
