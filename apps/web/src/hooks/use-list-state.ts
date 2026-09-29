import { useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/components/common/pagination";
import { statusToIsActive, type StatusFilter } from "@/lib/types";
import { useDebouncedValue } from "./use-debounced-value";

/**
 * Page/search/status state shared by every master list. Search is debounced
 * before it reaches the query key, and any filter change returns to page 1.
 */
export function useListState() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatusState] = useState<StatusFilter>("all");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  // The API rejects an empty search, so blank becomes "no search filter".
  const search = debouncedSearch === "" ? undefined : debouncedSearch;

  return {
    page,
    pageSize,
    searchInput,
    status,
    search,
    isActive: statusToIsActive(status),
    setPage,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    setSearch: (value: string) => {
      setSearchInput(value);
      setPage(1);
    },
    setStatus: (value: StatusFilter) => {
      setStatusState(value);
      setPage(1);
    },
    /** For extra filters: call after changing them. */
    resetPage: () => setPage(1),
  };
}

export type ListState = ReturnType<typeof useListState>;
