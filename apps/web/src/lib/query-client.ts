import { QueryClient } from "@tanstack/react-query";
import { ApiClientError } from "./api";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        // Retrying a 4xx (forbidden, not found, validation) cannot succeed.
        retry: (failureCount, error) =>
          failureCount < 1 &&
          !(error instanceof ApiClientError && error.status > 0 && error.status < 500),
        refetchOnWindowFocus: false,
      },
    },
  });
}
