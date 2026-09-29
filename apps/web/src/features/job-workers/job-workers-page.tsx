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
import { SimpleSelect } from "@/components/common/simple-select";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusToggleDialog } from "@/components/common/status-toggle-dialog";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { JobWorkerForm } from "./job-worker-form";
import { useJobWorkers, useUpdateJobWorker } from "./queries";
import type { JobWorker } from "./types";
import { NONE, processLabel, useJobWorkerReferences } from "./use-references";

export function formatCapacity(
  jobWorker: Pick<JobWorker, "capacityPerDay" | "capacityUnitId">,
  unitSymbol: (id: string | null) => string | null
) {
  if (jobWorker.capacityPerDay == null) return "—";
  const unit = unitSymbol(jobWorker.capacityUnitId);
  return `${jobWorker.capacityPerDay.toLocaleString()}${unit ? ` ${unit}` : ""} / day`;
}

function JobWorkersList() {
  const router = useRouter();
  const canCreate = usePermission(PermissionCode.JOB_WORKERS_CREATE);
  const canEdit = usePermission(PermissionCode.JOB_WORKERS_EDIT);
  const refs = useJobWorkerReferences();

  const list = useListState();
  const [processFilter, setProcessFilter] = useState(NONE);
  const processId = processFilter === NONE ? undefined : processFilter;

  const query = useJobWorkers({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    isActive: list.isActive,
    processId,
  });
  const items = query.data?.items ?? [];

  // `form` is undefined when closed, null for "create", a job worker for "edit".
  const [form, setForm] = useState<JobWorker | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<JobWorker | null>(null);
  const toggle = useUpdateJobWorker();

  return (
    <>
      <PageHeader
        title="Job Workers"
        description="External subcontractors that perform manufacturing processes."
        actions={
          canCreate && (
            <Button onClick={() => setForm(null)}>
              <Plus /> New job worker
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
          >
            {refs.canViewProcesses && (
              <SimpleSelect
                aria-label="Filter by process"
                className="sm:w-52"
                value={processFilter}
                onValueChange={(value) => {
                  setProcessFilter(value);
                  list.resetPage();
                }}
                disabled={refs.processes.isPending}
                options={[
                  { value: NONE, label: "All processes" },
                  ...(refs.processes.data ?? []).map((p) => ({
                    value: p.id,
                    label: p.isActive ? processLabel(p) : `${processLabel(p)} (inactive)`,
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
        isFiltered={Boolean(list.search) || list.status !== "all" || processId !== undefined}
        entityPlural="job workers"
        emptyAction={
          canCreate && (
            <Button variant="outline" onClick={() => setForm(null)}>
              Create the first job worker
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
              <TableHead className="hidden md:table-cell">Process</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Capacity</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Lead time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((jw) => (
              <TableRow key={jw.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/masters/job-workers/${jw.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {jw.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{jw.name}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {jw.processId ? (refs.processName(jw.processId) ?? "…") : "—"}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                  {formatCapacity(jw, refs.unitSymbol)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                  {jw.leadTimeDays == null ? "—" : `${jw.leadTimeDays} d`}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={jw.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    label={`Actions for ${jw.code}`}
                    actions={[
                      {
                        label: "View details",
                        onSelect: () => router.push(`/masters/job-workers/${jw.id}`),
                      },
                      canEdit && { label: "Edit", onSelect: () => setForm(jw) },
                      canEdit && {
                        label: jw.isActive ? "Deactivate" : "Reactivate",
                        destructive: jw.isActive,
                        onSelect: () => setToggleTarget(jw),
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
        title={form ? `Edit ${form.code}` : "New job worker"}
        description="Process and capacity unit are chosen from the Process and Unit masters."
      >
        {form !== undefined && (
          <JobWorkerForm jobWorker={form ?? undefined} onDone={() => setForm(undefined)} />
        )}
      </FormSheet>

      <StatusToggleDialog
        target={toggleTarget}
        entity="job worker"
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

export function JobWorkersPage() {
  return (
    <RequirePermission permission={PermissionCode.JOB_WORKERS_VIEW} what="job workers">
      <JobWorkersList />
    </RequirePermission>
  );
}
