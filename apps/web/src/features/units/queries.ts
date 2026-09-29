import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateUnitInput, UpdateUnitInput } from "@garment-erp/validation";
import type { ListParams } from "@/lib/types";
import { createUnit, listUnits, updateUnit } from "./api";

export const unitKeys = {
  all: ["units"] as const,
  lists: () => [...unitKeys.all, "list"] as const,
  list: (params: ListParams) => [...unitKeys.lists(), params] as const,
  lookup: () => [...unitKeys.all, "lookup"] as const,
};

export function useUnits(params: ListParams) {
  return useQuery({
    queryKey: unitKeys.list(params),
    queryFn: () => listUnits(params),
    placeholderData: keepPreviousData,
  });
}

// Largest page the API allows (paginationQuerySchema).
const LOOKUP_PAGE_SIZE = 200;

/** All units (active and inactive) for selectors and for labelling rows that reference one. */
export function useUnitLookup(enabled: boolean) {
  return useQuery({
    queryKey: unitKeys.lookup(),
    queryFn: () => listUnits({ page: 1, pageSize: LOOKUP_PAGE_SIZE }),
    select: (data) => data.items,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUnitInput) => createUnit(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitKeys.all }),
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUnitInput }) => updateUnit(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitKeys.all }),
  });
}
