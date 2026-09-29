"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { SUPPLIER_RATING_MAX } from "@garment-erp/validation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPanel } from "@/components/common/data-panel";
import { FormSheet } from "@/components/common/form-overlay";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { RequirePermission } from "@/components/common/require-permission";
import { RowActions } from "@/components/common/row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { SupplierForm } from "./supplier-form";
import { useSuppliers, useUpdateSupplier } from "./queries";
import type { Supplier } from "./types";

function SuppliersList() {
  const router = useRouter();
  const canCreate = usePermission(PermissionCode.SUPPLIERS_CREATE);
  const canEdit = usePermission(PermissionCode.SUPPLIERS_EDIT);

  const list = useListState();
  const query = useSuppliers({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a supplier for "edit".
  const [form, setForm] = useState<Supplier | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Supplier | null>(null);
  const toggle = useUpdateSupplier();

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Vendors of fabric, trims and other materials."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New supplier
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
        entityPlural="suppliers"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first supplier
            </Button>
          )
        }
        skeletonColumns={7}
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
              <TableHead className="hidden text-right lg:table-cell">Lead time</TableHead>
              <TableHead className="hidden lg:table-cell">Rating</TableHead>
              <TableHead className="hidden md:table-cell">Payment terms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/masters/suppliers/${supplier.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {supplier.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                  {supplier.leadTimeDays == null ? "—" : `${supplier.leadTimeDays} d`}
                </TableCell>
                <TableCell className="hidden tabular-nums lg:table-cell">
                  {supplier.rating == null ? "—" : `${supplier.rating} / ${SUPPLIER_RATING_MAX}`}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {supplier.paymentTerms ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={supplier.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${supplier.code}`}
                    actions={[
                      {
                        label: "View details",
                        onSelect: () => router.push(`/masters/suppliers/${supplier.id}`),
                      },
                      canEdit && { label: "Edit", onSelect: () => setForm(supplier) },
                      canEdit && {
                        label: supplier.isActive ? "Deactivate" : "Reactivate",
                        destructive: supplier.isActive,
                        onSelect: () => setToggleTarget(supplier),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>

      <FormSheet
        open={form !== undefined}
        onOpenChange={(open) => !open && setForm(undefined)}
        title={form ? `Edit ${form.code}` : "New supplier"}
        description="Contacts can be added on the supplier's detail page."
      >
        {form !== undefined && (
          <SupplierForm
            supplier={form ?? undefined}
            onDone={(saved) => {
              setForm(undefined);
              // A new supplier opens its detail page so contacts can be added straight away.
              if (saved && !form) router.push(`/masters/suppliers/${saved.id}`);
            }}
          />
        )}
      </FormSheet>

      <StatusToggleDialog
        target={toggleTarget}
        entity="supplier"
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

export function SuppliersPage() {
  return (
    <RequirePermission permission={PermissionCode.SUPPLIERS_VIEW} what="suppliers">
      <SuppliersList />
    </RequirePermission>
  );
}
