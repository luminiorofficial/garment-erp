"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "./simple-select";

// The API accepts 1–200 per page (paginationQuerySchema); these are the
// practical choices for a table.
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

interface PaginationProps {
  page: number;
  pageSize: number;
  /** Rows returned for the current page. */
  itemCount: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * The list endpoints return `{ items, page, pageSize }` without a total, so the
 * next page is assumed to exist exactly when the current one is full.
 */
export function Pagination({
  page,
  pageSize,
  itemCount,
  isFetching,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const hasNext = itemCount === pageSize;
  const first = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = (page - 1) * pageSize + itemCount;

  return (
    <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground" aria-live="polite">
        {itemCount === 0 ? "No rows on this page" : `Showing ${first}–${last}`}
        {isFetching && " · updating…"}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground" id="page-size-label">
            Rows
          </span>
          <SimpleSelect
            aria-label="Rows per page"
            className="w-20"
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
            options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-14 text-center tabular-nums">Page {page}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
