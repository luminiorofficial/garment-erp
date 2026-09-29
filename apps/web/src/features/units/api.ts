import type { CreateUnitInput, UpdateUnitInput } from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { ListParams, Paginated } from "@/lib/types";
import type { Unit } from "./types";

export function listUnits(params: ListParams) {
  return apiFetch<Paginated<Unit>>(`/api/units${buildQuery({ ...params })}`);
}

export function createUnit(input: CreateUnitInput) {
  return apiFetch<Unit>("/api/units", { method: "POST", ...jsonBody(input) });
}

export function updateUnit(id: string, input: UpdateUnitInput) {
  return apiFetch<Unit>(`/api/units/${id}`, { method: "PATCH", ...jsonBody(input) });
}
