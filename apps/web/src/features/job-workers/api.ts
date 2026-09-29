import type { CreateJobWorkerInput, UpdateJobWorkerInput } from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import type { JobWorker, JobWorkerListParams } from "./types";

export function listJobWorkers(params: JobWorkerListParams) {
  return apiFetch<Paginated<JobWorker>>(`/api/job-workers${buildQuery({ ...params })}`);
}

export function getJobWorker(id: string) {
  return apiFetch<JobWorker>(`/api/job-workers/${id}`);
}

export function createJobWorker(input: CreateJobWorkerInput) {
  return apiFetch<JobWorker>("/api/job-workers", { method: "POST", ...jsonBody(input) });
}

export function updateJobWorker(id: string, input: UpdateJobWorkerInput) {
  return apiFetch<JobWorker>(`/api/job-workers/${id}`, { method: "PATCH", ...jsonBody(input) });
}
