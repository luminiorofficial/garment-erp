import type { CreateColorInput, UpdateColorInput } from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { ListParams, Paginated } from "@/lib/types";
import type { Color } from "./types";

export function listColors(params: ListParams) {
  return apiFetch<Paginated<Color>>(`/api/colors${buildQuery({ ...params })}`);
}

export function createColor(input: CreateColorInput) {
  return apiFetch<Color>("/api/colors", { method: "POST", ...jsonBody(input) });
}

export function updateColor(id: string, input: UpdateColorInput) {
  return apiFetch<Color>(`/api/colors/${id}`, { method: "PATCH", ...jsonBody(input) });
}
