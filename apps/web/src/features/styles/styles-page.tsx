"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPanel } from "@/components/common/data-panel";
import { FormSheet } from "@/components/common/form-overlay";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { RequirePermission } from "@/components/common/require-permission";
import { RowActions } from "@/components/common/row-actions";
import { SimpleSelect } from "@/components/common/simple-select";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { StyleForm } from "./style-form";
import { useStyles, useUpdateStyle } from "./queries";
import type { Style } from "./types";
import { customerLabel, productLabel, useStyleReferences } from "./use-style-references";

const ALL = "all";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function StylesList() {
  const router = useRouter();
  const canCreate = usePermission(PermissionCode.STYLES_CREATE);
  const canEdit = usePermission(PermissionCode.STYLES_EDIT);
  const refs = useStyleReferences();

  // /masters/styles?productId=… (linked from a product) pre-applies the product filter.
  const initialProduct = useSearchParams().get("productId");
  const list = useListState();
  const [productFilter, setProductFilter] = useState(
    initialProduct && UUID.test(initialProduct) ? initialProduct : ALL
  );
  const [customerFilter, setCustomerFilter] = useState(ALL);

  const query = useStyles({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
    productId: productFilter === ALL ? undefined : productFilter,
    customerId: customerFilter === ALL ? undefined : customerFilter,
  });
  const items = query.data?.items ?? [];

  const [creating, setCreating] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Style | null>(null);
  const toggle = useUpdateStyle();

  return (
    <>
      <PageHeader
        title="Styles"
        description="Manufacturable, customer-facing garment definitions, each with its version history."
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> New style
            </Button>
          )
        }
      />

      <DataPanel
        toolbar={
          <ListToolbar
            search={list.searchInput}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by style number or name"
            status={list.status}
            onStatusChange={list.setStatus}
          >
            {refs.canViewProducts && (
              <SimpleSelect
                aria-label="Filter by product"
                className="sm:w-52"
                value={productFilter}
                onValueChange={(v) => {
                  setProductFilter(v);
                  list.resetPage();
                }}
                options={[
                  { value: ALL, label: "All products" },
                  ...(refs.products.data ?? []).map((p) => ({
                    value: p.id,
                    label: p.isActive ? productLabel(p) : `${productLabel(p)} (inactive)`,
                  })),
                  // Keep a URL-supplied filter visible even before the lookup loads.
                  ...(productFilter !== ALL && !refs.products.data
                    ? [{ value: productFilter, label: "Selected product" }]
                    : []),
                ]}
              />
            )}
            {refs.canViewCustomers && (
              <SimpleSelect
                aria-label="Filter by customer"
                className="sm:w-52"
                value={customerFilter}
                onValueChange={(v) => {
                  setCustomerFilter(v);
                  list.resetPage();
                }}
                disabled={refs.customers.isPending}
                options={[
                  { value: ALL, label: "All customers" },
                  ...(refs.customers.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.isActive ? customerLabel(c) : `${customerLabel(c)} (inactive)`,
                  })),
                ]}
              />
            )}
          </ListToolbar>
        }
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={items.length === 0 && list.page === 1}
        isFiltered={
          Boolean(list.search) ||
          list.status !== "all" ||
          productFilter !== ALL ||
          customerFilter !== ALL
        }
        entityPlural="styles"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setCreating(true)}>
              Create the first style
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
              <TableHead>Style no.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Product</TableHead>
              <TableHead className="hidden lg:table-cell">Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((style) => (
              <TableRow key={style.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/masters/styles/${style.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {style.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{style.name}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {refs.productName(style.productId) ?? (refs.canViewProducts ? "…" : "—")}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {style.customerId
                    ? (refs.customerName(style.customerId) ?? (refs.canViewCustomers ? "…" : "—"))
                    : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={style.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${style.code}`}
                    actions={[
                      {
                        label: "View details",
                        onSelect: () => router.push(`/masters/styles/${style.id}`),
                      },
                      canEdit && {
                        label: style.isActive ? "Deactivate" : "Reactivate",
                        destructive: style.isActive,
                        onSelect: () => setToggleTarget(style),
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
        open={creating}
        onOpenChange={setCreating}
        title="New style"
        description="Versions can be added on the style's detail page."
      >
        {creating && (
          <StyleForm
            initialProductId={productFilter === ALL ? undefined : productFilter}
            onDone={(saved) => {
              setCreating(false);
              // Open the new style so its first version can be recorded.
              if (saved) router.push(`/masters/styles/${saved.id}`);
            }}
          />
        )}
      </FormSheet>

      <StatusToggleDialog
        target={toggleTarget}
        entity="style"
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

export function StylesPage() {
  return (
    <RequirePermission permission={PermissionCode.STYLES_VIEW} what="styles">
      <StylesList />
    </RequirePermission>
  );
}
