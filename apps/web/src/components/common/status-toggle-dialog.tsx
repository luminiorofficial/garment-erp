"use client";

import { ConfirmDialog } from "./confirm-dialog";

export interface StatusToggleTarget {
  name: string;
  isActive: boolean;
}

interface StatusToggleDialogProps {
  target: StatusToggleTarget | null;
  /** Lower-case singular noun, e.g. "customer". */
  entity: string;
  isPending: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
}

/** Deactivate / reactivate confirmation shared by every master (there is no delete). */
export function StatusToggleDialog({
  target,
  entity,
  isPending,
  error,
  onConfirm,
  onClose,
}: StatusToggleDialogProps) {
  // The dialog animates out after `target` is cleared, so keep the last wording
  // rendering via the open flag rather than blanking the text.
  const deactivating = target?.isActive ?? true;
  const name = target?.name ?? "";

  return (
    <ConfirmDialog
      open={target !== null}
      destructive={deactivating}
      title={deactivating ? `Deactivate ${entity}?` : `Reactivate ${entity}?`}
      description={
        deactivating
          ? `“${name}” will no longer be selectable for new records. Existing records keep their reference and it can be reactivated at any time.`
          : `“${name}” will become available for new records again.`
      }
      confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
      isPending={isPending}
      error={error}
      onConfirm={onConfirm}
      onOpenChange={(open) => !open && onClose()}
    />
  );
}
