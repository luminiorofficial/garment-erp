"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { StatusFilter } from "@/lib/types";
import { SimpleSelect } from "./simple-select";

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  /** Extra master-specific filters (e.g. process). */
  children?: React.ReactNode;
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  children,
}: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <SimpleSelect
        aria-label="Filter by status"
        className="sm:w-36"
        value={status}
        onValueChange={(v) => onStatusChange(v as StatusFilter)}
        options={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
      {children}
    </div>
  );
}
