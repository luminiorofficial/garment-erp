import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateProcessInput, UpdateProcessInput } from "@garment-erp/validation";
import type { ListParams } from "@/lib/types";
import { createProcess, listProcesses, updateProcess } from "./api";

export const processKeys = {
  all: ["processes"] as const,
  lists: () => [...processKeys.all, "list"] as const,
  list: (params: ListParams) => [...processKeys.lists(), params] as const,
  lookup: () => [...processKeys.all, "lookup"] as const,
};

export function useProcesses(params: ListParams) {
  return useQuery({
    queryKey: processKeys.list(params),
    queryFn: () => listProcesses(params),
    placeholderData: keepPreviousData,
  });
}

// Largest page the API allows (paginationQuerySchema): enough to label and
// populate selectors for a reference master of this size.
const LOOKUP_PAGE_SIZE = 200;

/** All processes (active and inactive) for selectors and for labelling rows that reference one. */
export function useProcessLookup(enabled: boolean) {
  return useQuery({
    queryKey: processKeys.lookup(),
    queryFn: () => listProcesses({ page: 1, pageSize: LOOKUP_PAGE_SIZE }),
    select: (data) => data.items,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProcessInput) => createProcess(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: processKeys.all }),
  });
}

export function useUpdateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcessInput }) =>
      updateProcess(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: processKeys.all }),
  });
}
