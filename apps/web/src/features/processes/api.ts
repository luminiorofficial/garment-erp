import type { CreateProcessInput, UpdateProcessInput } from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { ListParams, Paginated } from "@/lib/types";
import type { Process } from "./types";

export function listProcesses(params: ListParams) {
  return apiFetch<Paginated<Process>>(`/api/processes${buildQuery({ ...params })}`);
}

export function createProcess(input: CreateProcessInput) {
  return apiFetch<Process>("/api/processes", { method: "POST", ...jsonBody(input) });
}

export function updateProcess(id: string, input: UpdateProcessInput) {
  return apiFetch<Process>(`/api/processes/${id}`, { method: "PATCH", ...jsonBody(input) });
}
