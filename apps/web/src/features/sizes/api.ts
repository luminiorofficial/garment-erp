import type { CreateSizeInput, UpdateSizeInput } from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { ListParams, Paginated } from "@/lib/types";
import type { Size } from "./types";

export function listSizes(params: ListParams) {
  return apiFetch<Paginated<Size>>(`/api/sizes${buildQuery({ ...params })}`);
}

export function createSize(input: CreateSizeInput) {
  return apiFetch<Size>("/api/sizes", { method: "POST", ...jsonBody(input) });
}

export function updateSize(id: string, input: UpdateSizeInput) {
  return apiFetch<Size>(`/api/sizes/${id}`, { method: "PATCH", ...jsonBody(input) });
}
