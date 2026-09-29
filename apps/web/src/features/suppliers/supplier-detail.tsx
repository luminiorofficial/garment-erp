"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { SUPPLIER_RATING_MAX, createSupplierContactSchema } from "@garment-erp/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContactsPanel } from "@/components/common/contacts-panel";
import { DetailGrid, DetailItem } from "@/components/common/detail-item";
import { FormSheet } from "@/components/common/form-overlay";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/common/require-permission";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { ErrorState, TableSkeleton } from "@/components/common/states";
import { ApiClientError } from "@/lib/api";
import { usePermission } from "@/hooks/use-permission";
import { SupplierForm } from "./supplier-form";
import {
  useCreateSupplierContact,
  useSupplier,
  useSupplierContacts,
  useUpdateSupplier,
  useUpdateSupplierContact,
} from "./queries";

function SupplierDetailView({ id }: { id: string }) {
  const canCreate = usePermission(PermissionCode.SUPPLIERS_CREATE);
  const canEdit = usePermission(PermissionCode.SUPPLIERS_EDIT);

  const supplier = useSupplier(id);
  const contacts = useSupplierContacts(id);
  const createContact = useCreateSupplierContact(id);
  const updateContact = useUpdateSupplierContact(id);
  const toggle = useUpdateSupplier();

  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (supplier.isPending) return <TableSkeleton columns={3} rows={4} />;
  if (supplier.isError) {
    const notFound = supplier.error instanceof ApiClientError && supplier.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Supplier not found" : "Could not load supplier"}
        error={supplier.error}
        onRetry={notFound ? undefined : () => void supplier.refetch()}
      />
    );
  }

  const s = supplier.data;

  return (
    <>
      <Link
        href="/masters/suppliers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> All suppliers
      </Link>

      <PageHeader
        title={s.name}
        description={`Code ${s.code}`}
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
            <DetailItem label="Lead time">
              {s.leadTimeDays == null ? null : `${s.leadTimeDays} days`}
            </DetailItem>
            <DetailItem label="Rating">
              {s.rating == null ? null : `${s.rating} / ${SUPPLIER_RATING_MAX}`}
            </DetailItem>
            <DetailItem label="Payment terms">{s.paymentTerms}</DetailItem>
            <DetailItem label="Billing address">{s.billingAddress}</DetailItem>
            <DetailItem label="Shipping address">{s.shippingAddress}</DetailItem>
            <DetailItem label="Tax information">{s.taxInformation}</DetailItem>
            <DetailItem label="Notes" className="sm:col-span-2 lg:col-span-3">
              {s.notes}
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <ContactsPanel
        contacts={contacts.data}
        isPending={contacts.isPending}
        isError={contacts.isError}
        error={contacts.error}
        onRetry={() => void contacts.refetch()}
        canCreate={canCreate}
        canEdit={canEdit}
        schema={createSupplierContactSchema}
        save={{
          isPending: createContact.isPending || updateContact.isPending,
          error: createContact.error ?? updateContact.error,
          reset: () => {
            createContact.reset();
            updateContact.reset();
          },
          create: (data, onSuccess) => createContact.mutate(data, { onSuccess }),
          update: (contactId, data, onSuccess) =>
            updateContact.mutate({ id: contactId, data }, { onSuccess }),
        }}
      />

      <FormSheet
        open={editing}
        onOpenChange={setEditing}
        title={`Edit ${s.code}`}
        description="Update the supplier's details."
      >
        {editing && <SupplierForm supplier={s} onDone={() => setEditing(false)} />}
      </FormSheet>

      <StatusToggleDialog
        target={toggling ? s : null}
        entity="supplier"
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

export function SupplierDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission={PermissionCode.SUPPLIERS_VIEW} what="suppliers">
      <SupplierDetailView id={id} />
    </RequirePermission>
  );
}
