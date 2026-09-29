import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, TableSkeleton } from "./states";

interface DataPanelProps {
  toolbar: React.ReactNode;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  isEmpty: boolean;
  /** True when a search/filter is applied, so "no results" reads differently from "nothing created yet". */
  isFiltered: boolean;
  entityPlural: string;
  emptyAction?: React.ReactNode;
  skeletonColumns: number;
  pagination: React.ReactNode;
  /** The table, rendered only when there are rows. */
  children: React.ReactNode;
}

/**
 * Card shell shared by the master lists: toolbar, then exactly one of
 * loading / error / empty / table, then pagination. Failed requests and empty
 * results are deliberately different states.
 */
export function DataPanel({
  toolbar,
  isPending,
  isError,
  error,
  onRetry,
  isEmpty,
  isFiltered,
  entityPlural,
  emptyAction,
  skeletonColumns,
  pagination,
  children,
}: DataPanelProps) {
  let body: React.ReactNode;
  if (isPending) {
    body = <TableSkeleton columns={skeletonColumns} />;
  } else if (isError) {
    body = <ErrorState error={error} title={`Could not load ${entityPlural}`} onRetry={onRetry} />;
  } else if (isEmpty) {
    body = isFiltered ? (
      <EmptyState
        title={`No ${entityPlural} match your search`}
        description="Try a different search term or clear the filters."
      />
    ) : (
      <EmptyState title={`No ${entityPlural} yet`} action={emptyAction} />
    );
  } else {
    body = children;
  }

  return (
    <Card className="gap-0 p-0">
      {toolbar}
      {body}
      {!isPending && !isError && pagination}
    </Card>
  );
}
