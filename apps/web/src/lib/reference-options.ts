import type { SelectOption } from "@/components/common/simple-select";

/**
 * Selectable options for an assignment to a reference master: the active
 * records, plus whatever the record being edited already holds even if that
 * master has since been deactivated (labelled "(inactive)"), so an unrelated
 * edit never silently drops a historical reference.
 */
export function referenceOptions<T extends { id: string; isActive: boolean }>(
  items: T[] | undefined,
  currentIds: string | null | undefined | readonly string[],
  label: (item: T) => string
): SelectOption[] {
  const current = new Set(
    typeof currentIds === "string" ? [currentIds] : (currentIds ?? [])
  );
  const options: SelectOption[] = [];
  for (const item of items ?? []) {
    if (item.isActive || current.has(item.id)) {
      options.push({
        value: item.id,
        label: item.isActive ? label(item) : `${label(item)} (inactive)`,
      });
    }
  }
  return options;
}

/** Resolves an id to its label from a loaded lookup, or null if it cannot be resolved. */
export function labelFor<T extends { id: string }>(
  items: T[] | undefined,
  id: string | null | undefined,
  label: (item: T) => string
): string | null {
  if (!id) return null;
  const found = items?.find((item) => item.id === id);
  return found ? label(found) : null;
}
