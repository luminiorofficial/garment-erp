import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStyleInput,
  CreateStyleVersionInput,
  UpdateStyleInput,
} from "@garment-erp/validation";
import {
  createStyle,
  createStyleVersion,
  getStyle,
  listStyles,
  listStyleVersions,
  updateStyle,
} from "./api";
import type { StyleListParams } from "./types";

export const styleKeys = {
  all: ["styles"] as const,
  lists: () => [...styleKeys.all, "list"] as const,
  list: (params: StyleListParams) => [...styleKeys.lists(), params] as const,
  detail: (id: string) => [...styleKeys.all, "detail", id] as const,
  versions: (id: string) => [...styleKeys.all, "detail", id, "versions"] as const,
};

export function useStyles(params: StyleListParams) {
  return useQuery({
    queryKey: styleKeys.list(params),
    queryFn: () => listStyles(params),
    placeholderData: keepPreviousData,
  });
}

export function useStyle(id: string) {
  return useQuery({ queryKey: styleKeys.detail(id), queryFn: () => getStyle(id) });
}

export function useStyleVersions(styleId: string) {
  return useQuery({
    queryKey: styleKeys.versions(styleId),
    queryFn: () => listStyleVersions(styleId),
    select: (data) => data.items,
  });
}

export function useCreateStyle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStyleInput) => createStyle(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: styleKeys.lists() }),
  });
}

export function useUpdateStyle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStyleInput }) => updateStyle(id, data),
    onSuccess: (style) => {
      queryClient.setQueryData(styleKeys.detail(style.id), style);
      return queryClient.invalidateQueries({ queryKey: styleKeys.lists() });
    },
  });
}

export function useCreateStyleVersion(styleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStyleVersionInput) => createStyleVersion(styleId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: styleKeys.versions(styleId) }),
  });
}
