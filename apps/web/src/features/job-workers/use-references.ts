import { PermissionCode } from "@garment-erp/shared";
import { usePermission } from "@/hooks/use-permission";
import type { SelectOption } from "@/components/common/simple-select";
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
 * Selectable options for an assignment: active masters, plus the value the
 * record already holds even if that master has since been deactivated (so an
 * unrelated edit does not silently drop a historical reference).
 */
function optionsFor<T extends { id: string; isActive: boolean }>(
  items: T[] | undefined,
  currentId: string | null | undefined,
  label: (item: T) => string
): SelectOption[] {
  const options: SelectOption[] = [];
  for (const item of items ?? []) {
    if (item.isActive || item.id === currentId) {
      options.push({
        value: item.id,
        label: item.isActive ? label(item) : `${label(item)} (inactive)`,
      });
    }
  }
  return options;
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
      optionsFor(processes.data, currentId, processLabel),
    unitOptions: (currentId?: string | null) => optionsFor(units.data, currentId, unitLabel),
    processName: (id: string | null) => {
      if (!id) return null;
      const found = processes.data?.find((p) => p.id === id);
      return found ? processLabel(found) : null;
    },
    unitName: (id: string | null) => {
      if (!id) return null;
      const found = units.data?.find((u) => u.id === id);
      return found ? unitLabel(found) : null;
    },
    unitSymbol: (id: string | null) => {
      if (!id) return null;
      const found = units.data?.find((u) => u.id === id);
      return found ? (found.symbol ?? found.name) : null;
    },
  };
}
