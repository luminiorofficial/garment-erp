// Small helpers shared by the master-data services (sizes, colors, products,
// styles). Earlier masters keep their own private copies; new ones import these.

// Drizzle wraps the pg error, so check both the error and its cause. Used to
// turn the race where two requests insert the same unique value concurrently
// into a clean 409.
export function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  return candidates.some(
    (candidate) => (candidate as { code?: unknown } | null)?.code === "23505",
  );
}

// Returns only the fields whose values actually changed, as { old, new }
// snapshots for the audit log.
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly (keyof T)[],
) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const field of fields) {
    if (before[field] !== after[field]) {
      oldValue[field as string] = before[field];
      newValue[field as string] = after[field];
    }
  }
  return { oldValue, newValue };
}

export function pickFields<T extends Record<string, unknown>>(
  row: T,
  fields: readonly (keyof T)[],
) {
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

export type StatusAction<E extends string> =
  | `${E}.activated`
  | `${E}.deactivated`
  | `${E}.updated`;

export function statusAction<E extends string>(
  entity: E,
  before: { isActive: boolean },
  input: { isActive?: boolean },
): StatusAction<E> {
  if (typeof input.isActive === "boolean" && input.isActive !== before.isActive) {
    return input.isActive ? `${entity}.activated` : `${entity}.deactivated`;
  }
  return `${entity}.updated`;
}
