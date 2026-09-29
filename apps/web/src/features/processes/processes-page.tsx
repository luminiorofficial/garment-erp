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
import { ProcessForm } from "./process-form";
import { useProcesses, useUpdateProcess } from "./queries";
import type { Process } from "./types";

function ProcessesList() {
  const canCreate = usePermission(PermissionCode.PROCESSES_CREATE);
  const canEdit = usePermission(PermissionCode.PROCESSES_EDIT);

  const list = useListState();
  const query = useProcesses({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a process for "edit".
  const [form, setForm] = useState<Process | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Process | null>(null);
  const toggle = useUpdateProcess();

  return (
    <>
      <PageHeader
        title="Processes"
        description="Manufacturing operations that job workers can perform."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New process
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
        entityPlural="processes"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first process
            </Button>
          )
        }
        skeletonColumns={5}
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
            {items.map((process) => (
              <TableRow key={process.id}>
                <TableCell className="font-mono text-xs">{process.code}</TableCell>
                <TableCell className="font-medium">{process.name}</TableCell>
                <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                  {process.description ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={process.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${process.code}`}
                    actions={[
                      canEdit && { label: "Edit", onSelect: () => setForm(process) },
                      canEdit && {
                        label: process.isActive ? "Deactivate" : "Reactivate",
                        destructive: process.isActive,
                        onSelect: () => setToggleTarget(process),
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
        title={form ? `Edit ${form.code}` : "New process"}
        description="A process is a manufacturing operation, such as stitching or washing."
      >
        {form !== undefined && (
          <ProcessForm process={form ?? undefined} onDone={() => setForm(undefined)} />
        )}
      </FormDialog>

      <StatusToggleDialog
        target={toggleTarget}
        entity="process"
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

export function ProcessesPage() {
  return (
    <RequirePermission permission={PermissionCode.PROCESSES_VIEW} what="processes">
      <ProcessesList />
    </RequirePermission>
  );
}
