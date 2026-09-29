import { PermissionCode } from "@garment-erp/shared";
import { usePermission } from "@/hooks/use-permission";
import { labelFor, referenceOptions } from "@/lib/reference-options";
import { useProcessLookup } from "@/features/processes/queries";
import type { Process } from "@/features/processes/types";
import { useUnitLookup } from "@/features/units/queries";
import type { Unit } from "@/features/units/types";

export const NONE = "none";

export function processLabel(process: Process) {
  return `${process.code} — ${process.name}`;
}

export function unitLabel(unit: Unit) {
  return unit.symbol ? `${unit.name} (${unit.symbol})` : unit.name;
}

/**
 * Process and Unit masters as seen from Job Workers. Lookups need the
 * processes.view / units.view permissions; without them the ids simply cannot
 * be resolved to names, and the form leaves those fields read-only.
 */
export function useJobWorkerReferences() {
  const canViewProcesses = usePermission(PermissionCode.PROCESSES_VIEW);
  const canViewUnits = usePermission(PermissionCode.UNITS_VIEW);
  const processes = useProcessLookup(canViewProcesses);
  const units = useUnitLookup(canViewUnits);

  return {
    canViewProcesses,
    canViewUnits,
    processes,
    units,
    processOptions: (currentId?: string | null) =>
      referenceOptions(processes.data, currentId, processLabel),
    unitOptions: (currentId?: string | null) =>
      referenceOptions(units.data, currentId, unitLabel),
    processName: (id: string | null) => labelFor(processes.data, id, processLabel),
    unitName: (id: string | null) => labelFor(units.data, id, unitLabel),
    unitSymbol: (id: string | null) => {
      if (!id) return null;
      const found = units.data?.find((u) => u.id === id);
      return found ? (found.symbol ?? found.name) : null;
    },
  };
}
