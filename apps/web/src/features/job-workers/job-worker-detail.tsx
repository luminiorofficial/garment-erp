"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailGrid, DetailItem } from "@/components/common/detail-item";
import { FormSheet } from "@/components/common/form-overlay";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/common/require-permission";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { ErrorState, TableSkeleton } from "@/components/common/states";
import { ApiClientError } from "@/lib/api";
import { usePermission } from "@/hooks/use-permission";
import { JobWorkerForm } from "./job-worker-form";
import { formatCapacity } from "./job-workers-page";
import { useJobWorker, useUpdateJobWorker } from "./queries";
import { useJobWorkerReferences } from "./use-references";

function JobWorkerDetailView({ id }: { id: string }) {
  const canEdit = usePermission(PermissionCode.JOB_WORKERS_EDIT);
  const refs = useJobWorkerReferences();
  const jobWorker = useJobWorker(id);
  const toggle = useUpdateJobWorker();

  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (jobWorker.isPending) return <TableSkeleton columns={3} rows={4} />;
  if (jobWorker.isError) {
    const notFound = jobWorker.error instanceof ApiClientError && jobWorker.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Job worker not found" : "Could not load job worker"}
        error={jobWorker.error}
        onRetry={notFound ? undefined : () => void jobWorker.refetch()}
      />
    );
  }

  const jw = jobWorker.data;

  return (
    <>
      <Link
        href="/masters/job-workers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> All job workers
      </Link>

      <PageHeader
        title={jw.name}
        description={`Code ${jw.code}`}
        actions={
          <>
            <StatusBadge isActive={jw.isActive} />
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant={jw.isActive ? "destructive" : "outline"}
                  onClick={() => setToggling(true)}
                >
                  {jw.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Contact person">{jw.contactPerson}</DetailItem>
            <DetailItem label="Email">{jw.email}</DetailItem>
            <DetailItem label="Phone">{jw.phone}</DetailItem>
            <DetailItem label="Process">
              {jw.processId
                ? (refs.processName(jw.processId) ??
                  (refs.canViewProcesses ? "Loading…" : "Not visible to your role"))
                : null}
            </DetailItem>
            <DetailItem label="Capacity">
              {jw.capacityPerDay == null ? null : formatCapacity(jw, refs.unitSymbol)}
            </DetailItem>
            <DetailItem label="Capacity unit">
              {jw.capacityUnitId ? refs.unitName(jw.capacityUnitId) : null}
            </DetailItem>
            <DetailItem label="Lead time">
              {jw.leadTimeDays == null ? null : `${jw.leadTimeDays} days`}
            </DetailItem>
            <DetailItem label="Rate agreement">{jw.rateAgreement}</DetailItem>
            <DetailItem label="Payment terms">{jw.paymentTerms}</DetailItem>
            <DetailItem label="Billing address">{jw.billingAddress}</DetailItem>
            <DetailItem label="Operating address">{jw.operatingAddress}</DetailItem>
            <DetailItem label="Tax information">{jw.taxInformation}</DetailItem>
            <DetailItem label="Notes" className="sm:col-span-2 lg:col-span-3">
              {jw.notes}
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <FormSheet
        open={editing}
        onOpenChange={setEditing}
        title={`Edit ${jw.code}`}
        description="Process and capacity unit are chosen from the Process and Unit masters."
      >
        {editing && <JobWorkerForm jobWorker={jw} onDone={() => setEditing(false)} />}
      </FormSheet>

      <StatusToggleDialog
        target={toggling ? jw : null}
        entity="job worker"
        isPending={toggle.isPending}
        error={toggle.error}
        onClose={() => {
          setToggling(false);
          toggle.reset();
        }}
        onConfirm={() =>
          toggle.mutate(
            { id: jw.id, data: { isActive: !jw.isActive } },
            { onSuccess: () => setToggling(false) }
          )
        }
      />
    </>
  );
}

export function JobWorkerDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission={PermissionCode.JOB_WORKERS_VIEW} what="job workers">
      <JobWorkerDetailView id={id} />
    </RequirePermission>
  );
}
