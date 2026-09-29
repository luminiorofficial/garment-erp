"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { createCustomerContactSchema } from "@garment-erp/validation";
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
import { CustomerForm } from "./customer-form";
import {
  useCreateCustomerContact,
  useCustomer,
  useCustomerContacts,
  useUpdateCustomer,
  useUpdateCustomerContact,
} from "./queries";

function CustomerDetailView({ id }: { id: string }) {
  const canCreate = usePermission(PermissionCode.CUSTOMERS_CREATE);
  const canEdit = usePermission(PermissionCode.CUSTOMERS_EDIT);

  const customer = useCustomer(id);
  const contacts = useCustomerContacts(id);
  const createContact = useCreateCustomerContact(id);
  const updateContact = useUpdateCustomerContact(id);
  const toggle = useUpdateCustomer();

  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (customer.isPending) return <TableSkeleton columns={3} rows={4} />;
  if (customer.isError) {
    const notFound = customer.error instanceof ApiClientError && customer.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Customer not found" : "Could not load customer"}
        error={customer.error}
        onRetry={notFound ? undefined : () => void customer.refetch()}
      />
    );
  }

  const c = customer.data;

  return (
    <>
      <Link
        href="/masters/customers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> All customers
      </Link>

      <PageHeader
        title={`${c.name}`}
        description={`Code ${c.code}`}
        actions={
          <>
            <StatusBadge isActive={c.isActive} />
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant={c.isActive ? "destructive" : "outline"}
                  onClick={() => setToggling(true)}
                >
                  {c.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Billing address">{c.billingAddress}</DetailItem>
            <DetailItem label="Shipping address">{c.shippingAddress}</DetailItem>
            <DetailItem label="Payment terms">{c.paymentTerms}</DetailItem>
            <DetailItem label="Tax information">{c.taxInformation}</DetailItem>
            <DetailItem label="Notes" className="sm:col-span-2">
              {c.notes}
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
        schema={createCustomerContactSchema}
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
        title={`Edit ${c.code}`}
        description="Update the customer's details."
      >
        {editing && <CustomerForm customer={c} onDone={() => setEditing(false)} />}
      </FormSheet>

      <StatusToggleDialog
        target={toggling ? c : null}
        entity="customer"
        isPending={toggle.isPending}
        error={toggle.error}
        onClose={() => {
          setToggling(false);
          toggle.reset();
        }}
        onConfirm={() =>
          toggle.mutate(
            { id: c.id, data: { isActive: !c.isActive } },
            { onSuccess: () => setToggling(false) }
          )
        }
      />
    </>
  );
}

export function CustomerDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission={PermissionCode.CUSTOMERS_VIEW} what="customers">
      <CustomerDetailView id={id} />
    </RequirePermission>
  );
}
