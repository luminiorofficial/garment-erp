import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateColorInput, UpdateColorInput } from "@garment-erp/validation";
import type { ListParams } from "@/lib/types";
import { createColor, listColors, updateColor } from "./api";

export const colorKeys = {
  all: ["colors"] as const,
  lists: () => [...colorKeys.all, "list"] as const,
  list: (params: ListParams) => [...colorKeys.lists(), params] as const,
  lookup: () => [...colorKeys.all, "lookup"] as const,
};

export function useColors(params: ListParams) {
  return useQuery({
    queryKey: colorKeys.list(params),
    queryFn: () => listColors(params),
    placeholderData: keepPreviousData,
  });
}

// Largest page the API allows (paginationQuerySchema).
const LOOKUP_PAGE_SIZE = 200;

/** All colors (active and inactive) for selectors and labels. */
export function useColorLookup(enabled: boolean) {
  return useQuery({
    queryKey: colorKeys.lookup(),
    queryFn: () => listColors({ page: 1, pageSize: LOOKUP_PAGE_SIZE }),
    select: (data) => data.items,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateColorInput) => createColor(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: colorKeys.all }),
  });
}

export function useUpdateColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateColorInput }) => updateColor(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: colorKeys.all }),
  });
}
