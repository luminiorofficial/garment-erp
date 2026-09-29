"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailGrid, DetailItem } from "@/components/common/detail-item";
import { FormDialog } from "@/components/common/form-overlay";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/common/require-permission";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { ErrorState, TableSkeleton } from "@/components/common/states";
import { ApiClientError } from "@/lib/api";
import { usePermission } from "@/hooks/use-permission";
import { ProductForm } from "./product-form";
import { useProduct, useUpdateProduct } from "./queries";

function ProductDetailView({ id }: { id: string }) {
  const canEdit = usePermission(PermissionCode.PRODUCTS_EDIT);
  const canViewStyles = usePermission(PermissionCode.STYLES_VIEW);
  const product = useProduct(id);
  const toggle = useUpdateProduct();

  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (product.isPending) return <TableSkeleton columns={3} rows={4} />;
  if (product.isError) {
    const notFound = product.error instanceof ApiClientError && product.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Product not found" : "Could not load product"}
        error={product.error}
        onRetry={notFound ? undefined : () => void product.refetch()}
      />
    );
  }

  const p = product.data;

  return (
    <>
      <Link
        href="/masters/products"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> All products
      </Link>

      <PageHeader
        title={p.name}
        description={`Code ${p.code}`}
        actions={
          <>
            <StatusBadge isActive={p.isActive} />
            {canViewStyles && (
              <Link
                href={`/masters/styles?productId=${p.id}`}
                className="text-sm underline-offset-2 hover:underline"
              >
                View styles
              </Link>
            )}
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant={p.isActive ? "destructive" : "outline"}
                  onClick={() => setToggling(true)}
                >
                  {p.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Category">{p.category}</DetailItem>
            <DetailItem label="Description" className="sm:col-span-2">
              {p.description}
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title={`Edit ${p.code}`}
        description="Update the product's details."
      >
        {editing && <ProductForm product={p} onDone={() => setEditing(false)} />}
      </FormDialog>

      <StatusToggleDialog
        target={toggling ? p : null}
        entity="product"
        isPending={toggle.isPending}
        error={toggle.error}
        onClose={() => {
          setToggling(false);
          toggle.reset();
        }}
        onConfirm={() =>
          toggle.mutate(
            { id: p.id, data: { isActive: !p.isActive } },
            { onSuccess: () => setToggling(false) }
          )
        }
      />
    </>
  );
}

export function ProductDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission={PermissionCode.PRODUCTS_VIEW} what="products">
      <ProductDetailView id={id} />
    </RequirePermission>
  );
}
