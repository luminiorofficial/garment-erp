import type {
  CreateStyleInput,
  CreateStyleVersionInput,
  UpdateStyleInput,
} from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import type { Style, StyleDetail, StyleListParams, StyleVersion } from "./types";

export function listStyles(params: StyleListParams) {
  return apiFetch<Paginated<Style>>(`/api/styles${buildQuery({ ...params })}`);
}

export function getStyle(id: string) {
  return apiFetch<StyleDetail>(`/api/styles/${id}`);
}

export function createStyle(input: CreateStyleInput) {
  return apiFetch<StyleDetail>("/api/styles", { method: "POST", ...jsonBody(input) });
}

export function updateStyle(id: string, input: UpdateStyleInput) {
  return apiFetch<StyleDetail>(`/api/styles/${id}`, { method: "PATCH", ...jsonBody(input) });
}

export function listStyleVersions(styleId: string) {
  return apiFetch<{ items: StyleVersion[] }>(`/api/styles/${styleId}/versions`);
}

export function createStyleVersion(styleId: string, input: CreateStyleVersionInput) {
  return apiFetch<StyleVersion>(`/api/styles/${styleId}/versions`, {
    method: "POST",
    ...jsonBody(input),
  });
}
