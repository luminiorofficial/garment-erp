import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateJobWorkerInput, UpdateJobWorkerInput } from "@garment-erp/validation";
import { createJobWorker, getJobWorker, listJobWorkers, updateJobWorker } from "./api";
import type { JobWorkerListParams } from "./types";

export const jobWorkerKeys = {
  all: ["job-workers"] as const,
  lists: () => [...jobWorkerKeys.all, "list"] as const,
  list: (params: JobWorkerListParams) => [...jobWorkerKeys.lists(), params] as const,
  detail: (id: string) => [...jobWorkerKeys.all, "detail", id] as const,
};

export function useJobWorkers(params: JobWorkerListParams) {
  return useQuery({
    queryKey: jobWorkerKeys.list(params),
    queryFn: () => listJobWorkers(params),
    placeholderData: keepPreviousData,
  });
}

export function useJobWorker(id: string) {
  return useQuery({ queryKey: jobWorkerKeys.detail(id), queryFn: () => getJobWorker(id) });
}

export function useCreateJobWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobWorkerInput) => createJobWorker(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobWorkerKeys.lists() }),
  });
}

export function useUpdateJobWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobWorkerInput }) =>
      updateJobWorker(id, data),
    onSuccess: (jobWorker) => {
      queryClient.setQueryData(jobWorkerKeys.detail(jobWorker.id), jobWorker);
      return queryClient.invalidateQueries({ queryKey: jobWorkerKeys.lists() });
    },
  });
}
