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
import { UnitForm } from "./unit-form";
import { useUnits, useUpdateUnit } from "./queries";
import type { Unit } from "./types";

function UnitsList() {
  const canCreate = usePermission(PermissionCode.UNITS_CREATE);
  const canEdit = usePermission(PermissionCode.UNITS_EDIT);

  const list = useListState();
  const query = useUnits({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a unit for "edit".
  const [form, setForm] = useState<Unit | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Unit | null>(null);
  const toggle = useUpdateUnit();

  return (
    <>
      <PageHeader
        title="Units"
        description="Units of measure used for capacity and, later, quantities."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New unit
            </Button>
          )
        }
      />

      <DataPanel
        toolbar={
          <ListToolbar
            search={list.searchInput}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by code, name or symbol"
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
        entityPlural="units"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first unit
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Decimal places</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-mono text-xs">{unit.code}</TableCell>
                <TableCell className="font-medium">{unit.name}</TableCell>
                <TableCell>{unit.symbol ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{unit.decimalPlaces}</TableCell>
                <TableCell>
                  <StatusBadge isActive={unit.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${unit.code}`}
                    actions={[
                      canEdit && { label: "Edit", onSelect: () => setForm(unit) },
                      canEdit && {
                        label: unit.isActive ? "Deactivate" : "Reactivate",
                        destructive: unit.isActive,
                        onSelect: () => setToggleTarget(unit),
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
        title={form ? `Edit ${form.code}` : "New unit"}
        description="A unit of measure, such as pieces or metres."
      >
        {form !== undefined && (
          <UnitForm unit={form ?? undefined} onDone={() => setForm(undefined)} />
        )}
      </FormDialog>

      <StatusToggleDialog
        target={toggleTarget}
        entity="unit"
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

export function UnitsPage() {
  return (
    <RequirePermission permission={PermissionCode.UNITS_VIEW} what="units">
      <UnitsList />
    </RequirePermission>
  );
}
