"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { CustomerForm } from "./customer-form";
import { useCustomers, useUpdateCustomer } from "./queries";
import type { Customer } from "./types";

function CustomersList() {
  const router = useRouter();
  const canCreate = usePermission(PermissionCode.CUSTOMERS_CREATE);
  const canEdit = usePermission(PermissionCode.CUSTOMERS_EDIT);

  const list = useListState();
  const query = useCustomers({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a customer for "edit".
  const [form, setForm] = useState<Customer | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Customer | null>(null);
  const toggle = useUpdateCustomer();

  return (
    <>
      <PageHeader
        title="Customers"
        description="Buyers you produce and ship orders for."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New customer
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
        entityPlural="customers"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first customer
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
              <TableHead className="hidden md:table-cell">Payment terms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/masters/customers/${customer.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {customer.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {customer.paymentTerms ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={customer.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${customer.code}`}
                    actions={[
                      {
                        label: "View details",
                        onSelect: () => router.push(`/masters/customers/${customer.id}`),
                      },
                      canEdit && { label: "Edit", onSelect: () => setForm(customer) },
                      canEdit && {
                        label: customer.isActive ? "Deactivate" : "Reactivate",
                        destructive: customer.isActive,
                        onSelect: () => setToggleTarget(customer),
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
        title={form ? `Edit ${form.code}` : "New customer"}
        description="Contacts can be added on the customer's detail page."
      >
        {form !== undefined && (
          <CustomerForm
            customer={form ?? undefined}
            onDone={(saved) => {
              setForm(undefined);
              // A new customer opens its detail page so contacts can be added straight away.
              if (saved && !form) router.push(`/masters/customers/${saved.id}`);
            }}
          />
        )}
      </FormSheet>

      <StatusToggleDialog
        target={toggleTarget}
        entity="customer"
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

export function CustomersPage() {
  return (
    <RequirePermission permission={PermissionCode.CUSTOMERS_VIEW} what="customers">
      <CustomersList />
    </RequirePermission>
  );
}
