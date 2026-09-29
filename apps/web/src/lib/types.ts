/** List envelope returned by every paginated master endpoint. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
}

/** Filter shared by every master list; maps to the API's `isActive=true|false`. */
export type StatusFilter = "all" | "active" | "inactive";

export function statusToIsActive(status: StatusFilter): boolean | undefined {
  if (status === "active") return true;
  if (status === "inactive") return false;
  return undefined;
}

/** Query parameters every master list accepts (see paginationQuerySchema + list*QuerySchema). */
export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
