"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ProductForm } from "./product-form";
import { useProducts, useUpdateProduct } from "./queries";
import type { Product } from "./types";

function ProductsList() {
  const router = useRouter();
  const canCreate = usePermission(PermissionCode.PRODUCTS_CREATE);
  const canEdit = usePermission(PermissionCode.PRODUCTS_EDIT);

  const list = useListState();
  const query = useProducts({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a product for "edit".
  const [form, setForm] = useState<Product | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const toggle = useUpdateProduct();

  return (
    <>
      <PageHeader
        title="Products"
        description="General garment identities. Specific manufacturable variants are Styles."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New product
            </Button>
          )
        }
      />

      <DataPanel
        toolbar={
          <ListToolbar
            search={list.searchInput}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by code, name or category"
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
        entityPlural="products"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first product
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
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/masters/products/${product.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {product.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {product.category}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={product.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${product.code}`}
                    actions={[
                      {
                        label: "View details",
                        onSelect: () => router.push(`/masters/products/${product.id}`),
                      },
                      canEdit && { label: "Edit", onSelect: () => setForm(product) },
                      canEdit && {
                        label: product.isActive ? "Deactivate" : "Reactivate",
                        destructive: product.isActive,
                        onSelect: () => setToggleTarget(product),
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
        title={form ? `Edit ${form.code}` : "New product"}
        description="A product is the general garment identity, such as a crew-neck T-shirt."
      >
        {form !== undefined && (
          <ProductForm product={form ?? undefined} onDone={() => setForm(undefined)} />
        )}
      </FormDialog>

      <StatusToggleDialog
        target={toggleTarget}
        entity="product"
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

export function ProductsPage() {
  return (
    <RequirePermission permission={PermissionCode.PRODUCTS_VIEW} what="products">
      <ProductsList />
    </RequirePermission>
  );
}
