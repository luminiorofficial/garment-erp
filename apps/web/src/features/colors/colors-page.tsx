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
import { ColorForm } from "./color-form";
import { ColorSwatch } from "./color-swatch";
import { useColors, useUpdateColor } from "./queries";
import type { Color } from "./types";

function ColorsList() {
  const canCreate = usePermission(PermissionCode.COLORS_CREATE);
  const canEdit = usePermission(PermissionCode.COLORS_EDIT);

  const list = useListState();
  const query = useColors({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a color for "edit".
  const [form, setForm] = useState<Color | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Color | null>(null);
  const toggle = useUpdateColor();

  return (
    <>
      <PageHeader
        title="Colors"
        description="Commercial color references. Fabric shades and lots are tracked separately, later."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New color
            </Button>
          )
        }
      />

      <DataPanel
        toolbar={
          <ListToolbar
            search={list.searchInput}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by code, name or reference"
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
        entityPlural="colors"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first color
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
              <TableHead className="hidden md:table-cell">Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((color) => (
              <TableRow key={color.id}>
                <TableCell className="font-mono text-xs">{color.code}</TableCell>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <ColorSwatch hex={color.hexValue} />
                    {color.name}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {color.reference ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={color.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${color.code}`}
                    actions={[
                      canEdit && { label: "Edit", onSelect: () => setForm(color) },
                      canEdit && {
                        label: color.isActive ? "Deactivate" : "Reactivate",
                        destructive: color.isActive,
                        onSelect: () => setToggleTarget(color),
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
        title={form ? `Edit ${form.code}` : "New color"}
        description="A commercial/design color reference."
      >
        {form !== undefined && (
          <ColorForm color={form ?? undefined} onDone={() => setForm(undefined)} />
        )}
      </FormDialog>

      <StatusToggleDialog
        target={toggleTarget}
        entity="color"
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

export function ColorsPage() {
  return (
    <RequirePermission permission={PermissionCode.COLORS_VIEW} what="colors">
      <ColorsList />
    </RequirePermission>
  );
}
