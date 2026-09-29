"use client";

import { Button } from "@/components/ui/button";
import { MutationError } from "./states";

/** Form-level message for validation problems that do not belong to one field. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function FormFooter({
  isPending,
  submitLabel,
  onCancel,
  error,
  formError,
}: {
  isPending: boolean;
  submitLabel: string;
  onCancel: () => void;
  /** Failed API call (kept visible with the API's own message). */
  error?: unknown;
  formError?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <FormError message={formError} />
      <MutationError error={error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
