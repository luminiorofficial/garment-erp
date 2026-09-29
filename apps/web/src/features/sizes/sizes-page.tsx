"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPanel } from "@/components/common/data-panel";
import { FormDialog } from "@/components/common/form-overlay";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { RequirePermission } from "@/components/common/require-permission";
import { RowActions } from "@/components/common/row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { SizeForm } from "./size-form";
import { useSizes, useUpdateSize } from "./queries";
import type { Size } from "./types";

function SizesList() {
  const canCreate = usePermission(PermissionCode.SIZES_CREATE);
  const canEdit = usePermission(PermissionCode.SIZES_EDIT);

  const list = useListState();
  const query = useSizes({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a size for "edit".
  const [form, setForm] = useState<Size | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Size | null>(null);
  const toggle = useUpdateSize();

  return (
    <>
      <PageHeader
        title="Sizes"
        description="Sizes a style can be made in, listed in display order."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New size
            </Button>
          )
        }
      />

      <DataPanel
        toolbar={
          <ListToolbar
            search={list.searchInput}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by code or name"
            status={list.status}
            onStatusChange={list.setStatus}
          />
        }
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={items.length === 0 && list.page === 1}
        isFiltered={Boolean(list.search) || list.status !== "all"}
        entityPlural="sizes"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first size
            </Button>
          )
        }
        skeletonColumns={6}
        pagination={
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            itemCount={items.length}
            isFetching={query.isFetching}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">Sequence</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((size) => (
              <TableRow key={size.id}>
                <TableCell className="text-right tabular-nums">{size.sequence}</TableCell>
                <TableCell className="font-mono text-xs">{size.code}</TableCell>
                <TableCell className="font-medium">{size.name}</TableCell>
                <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                  {size.description ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={size.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${size.code}`}
                    actions={[
                      canEdit && { label: "Edit", onSelect: () => setForm(size) },
                      canEdit && {
                        label: size.isActive ? "Deactivate" : "Reactivate",
                        destructive: size.isActive,
                        onSelect: () => setToggleTarget(size),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>

      <FormDialog
        open={form !== undefined}
        onOpenChange={(open) => !open && setForm(undefined)}
        title={form ? `Edit ${form.code}` : "New size"}
        description="Sizes are ordered by sequence wherever they are listed."
      >
        {form !== undefined && (
          <SizeForm size={form ?? undefined} onDone={() => setForm(undefined)} />
        )}
      </FormDialog>

      <StatusToggleDialog
        target={toggleTarget}
        entity="size"
        isPending={toggle.isPending}
        error={toggle.error}
        onClose={() => {
          setToggleTarget(null);
          toggle.reset();
        }}
        onConfirm={() =>
          toggleTarget &&
          toggle.mutate(
            { id: toggleTarget.id, data: { isActive: !toggleTarget.isActive } },
            { onSuccess: () => setToggleTarget(null) }
          )
        }
      />
    </>
  );
}

export function SizesPage() {
  return (
    <RequirePermission permission={PermissionCode.SIZES_VIEW} what="sizes">
      <SizesList />
    </RequirePermission>
  );
}
