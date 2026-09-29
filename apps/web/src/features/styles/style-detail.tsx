"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailGrid, DetailItem } from "@/components/common/detail-item";
import { FormDialog, FormSheet } from "@/components/common/form-overlay";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/common/require-permission";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { ApiClientError } from "@/lib/api";
import { usePermission } from "@/hooks/use-permission";
import { ColorSwatch } from "@/features/colors/color-swatch";
import { StyleForm } from "./style-form";
import { StyleVersionForm } from "./style-version-form";
import { useStyle, useStyleVersions, useUpdateStyle } from "./queries";
import { versionLabel } from "./types";
import { colorLabel, sizeLabel, useStyleReferences } from "./use-style-references";

/** Assigned masters as badges. Ids that cannot be resolved are said so, never invented. */
function AssignedBadges({
  ids,
  canView,
  isLoading,
  isError,
  render,
  noun,
}: {
  ids: string[];
  canView: boolean;
  isLoading: boolean;
  isError: boolean;
  render: (id: string) => { label: string; inactive: boolean; swatch?: string | null } | null;
  noun: string;
}) {
  if (ids.length === 0) return <span className="text-muted-foreground">None assigned</span>;
  if (!canView)
    return (
      <span className="text-muted-foreground">
        {ids.length} {noun} assigned (names not visible to your role)
      </span>
    );
  if (isLoading) return <span className="text-muted-foreground">Loading…</span>;
  if (isError)
    return (
      <span className="text-destructive">
        Could not load {noun} names ({ids.length} assigned)
      </span>
    );

  return (
    <ul className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const item = render(id);
        return (
          <li key={id}>
            <Badge variant={item?.inactive ? "outline" : "secondary"} className="gap-1.5">
              {item?.swatch !== undefined && <ColorSwatch hex={item.swatch} />}
              {item ? item.label : "Unknown"}
              {item?.inactive && <span className="text-muted-foreground">(inactive)</span>}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

function StyleVersions({ styleId, styleActive }: { styleId: string; styleActive: boolean }) {
  const canEdit = usePermission(PermissionCode.STYLES_EDIT);
  const versions = useStyleVersions(styleId);
  const [adding, setAdding] = useState(false);

  let body: React.ReactNode;
  if (versions.isPending) body = <TableSkeleton columns={3} rows={3} />;
  else if (versions.isError)
    body = (
      <ErrorState
        title="Could not load versions"
        error={versions.error}
        onRetry={() => void versions.refetch()}
      />
    );
  else if (versions.data.length === 0)
    body = (
      <EmptyState
        title="No versions yet"
        description="A version records the style definition at a point in time."
      />
    );
  else
    body = (
      <ol className="divide-y">
        {versions.data.map((version) => (
          <li key={version.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-medium">{versionLabel(version.versionNumber)}</span>
              <time className="text-xs text-muted-foreground" dateTime={version.createdAt}>
                {new Date(version.createdAt).toLocaleString()}
              </time>
            </div>
            {version.changeSummary && <p className="text-sm">{version.changeSummary}</p>}
            {version.specification && (
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {version.specification}
              </p>
            )}
          </li>
        ))}
      </ol>
    );

  return (
    <Card className="gap-0 p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
        <CardTitle>Versions</CardTitle>
        {canEdit &&
          (styleActive ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> New version
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Reactivate the style to add versions
            </span>
          ))}
      </CardHeader>
      <CardContent className="p-0">{body}</CardContent>

      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="New version"
        description="Records the style definition as a new version. Earlier versions are kept unchanged."
      >
        {adding && <StyleVersionForm styleId={styleId} onDone={() => setAdding(false)} />}
      </FormDialog>
    </Card>
  );
}

function StyleDetailView({ id }: { id: string }) {
  const canEdit = usePermission(PermissionCode.STYLES_EDIT);
  const canViewProducts = usePermission(PermissionCode.PRODUCTS_VIEW);
  const style = useStyle(id);
  const refs = useStyleReferences();
  const toggle = useUpdateStyle();

  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (style.isPending) return <TableSkeleton columns={3} rows={4} />;
  if (style.isError) {
    const notFound = style.error instanceof ApiClientError && style.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Style not found" : "Could not load style"}
        error={style.error}
        onRetry={notFound ? undefined : () => void style.refetch()}
      />
    );
  }

  const s = style.data;
  const product = refs.products.data?.find((p) => p.id === s.productId);
  const customer = refs.customers.data?.find((c) => c.id === s.customerId);

  return (
    <>
      <Link
        href="/masters/styles"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> All styles
      </Link>

      <PageHeader
        title={s.name}
        description={`Style ${s.code}`}
        actions={
          <>
            <StatusBadge isActive={s.isActive} />
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant={s.isActive ? "destructive" : "outline"}
                  onClick={() => setToggling(true)}
                >
                  {s.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Product">
              {product ? (
                <span className="flex flex-wrap items-center gap-2">
                  {canViewProducts ? (
                    <Link
                      href={`/masters/products/${product.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {`${product.code} — ${product.name}`}
                    </Link>
                  ) : (
                    `${product.code} — ${product.name}`
                  )}
                  {!product.isActive && <Badge variant="outline">Inactive product</Badge>}
                </span>
              ) : refs.canViewProducts ? (
                refs.products.isError ? (
                  "Could not load product"
                ) : (
                  "Loading…"
                )
              ) : (
                "Not visible to your role"
              )}
            </DetailItem>
            <DetailItem label="Customer">
              {s.customerId
                ? customer
                  ? `${customer.code} — ${customer.name}${customer.isActive ? "" : " (inactive)"}`
                  : refs.canViewCustomers
                    ? refs.customers.isError
                      ? "Could not load customer"
                      : "Loading…"
                    : "Not visible to your role"
                : null}
            </DetailItem>
            <DetailItem label="Description" className="sm:col-span-2 lg:col-span-1">
              {s.description}
            </DetailItem>
            <DetailItem label="Allowed sizes" className="sm:col-span-2 lg:col-span-3">
              <AssignedBadges
                ids={s.sizeIds}
                canView={refs.canViewSizes}
                isLoading={refs.sizes.isPending}
                isError={refs.sizes.isError}
                noun="sizes"
                render={(sizeId) => {
                  const size = refs.sizes.data?.find((x) => x.id === sizeId);
                  return size ? { label: sizeLabel(size), inactive: !size.isActive } : null;
                }}
              />
            </DetailItem>
            <DetailItem label="Allowed colors" className="sm:col-span-2 lg:col-span-3">
              <AssignedBadges
                ids={s.colorIds}
                canView={refs.canViewColors}
                isLoading={refs.colors.isPending}
                isError={refs.colors.isError}
                noun="colors"
                render={(colorId) => {
                  const color = refs.colors.data?.find((x) => x.id === colorId);
                  return color
                    ? { label: colorLabel(color), inactive: !color.isActive, swatch: color.hexValue }
                    : null;
                }}
              />
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <StyleVersions styleId={s.id} styleActive={s.isActive} />

      <FormSheet
        open={editing}
        onOpenChange={setEditing}
        title={`Edit ${s.code}`}
        description="Update the style's details, product, allowed sizes and colors."
      >
        {editing && <StyleForm style={s} onDone={() => setEditing(false)} />}
      </FormSheet>

      <StatusToggleDialog
        target={toggling ? s : null}
        entity="style"
        isPending={toggle.isPending}
        error={toggle.error}
        onClose={() => {
          setToggling(false);
          toggle.reset();
        }}
        onConfirm={() =>
          toggle.mutate(
            { id: s.id, data: { isActive: !s.isActive } },
            { onSuccess: () => setToggling(false) }
          )
        }
      />
    </>
  );
}

export function StyleDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission={PermissionCode.STYLES_VIEW} what="styles">
      <StyleDetailView id={id} />
    </RequirePermission>
  );
}
