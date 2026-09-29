export interface FormErrors {
  fields: Record<string, string>;
  form?: string;
}

interface IssueLike {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}

/** Maps a Zod error onto per-field messages; path-less issues become a form-level message. */
export function formErrorsFromZod(error: IssueLike): FormErrors {
  const result: FormErrors = { fields: {} };
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      result.fields[key] ??= issue.message;
    } else {
      result.form ??= issue.message;
    }
  }
  return result;
}

/** Trimmed string, or undefined when blank — matches the schemas' `optional()` text fields. */
export function blankToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Blank number input → undefined; otherwise the number (NaN is left for the schema to reject). */
export function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

/**
 * PATCH bodies clear a field with `null`, whereas create bodies omit it. After
 * validating a form with the create schema, fill the omitted nullable keys with
 * null so an edit that blanks a field actually clears it.
 */
export function withNulls<T extends object, K extends keyof T>(
  data: T,
  keys: readonly K[]
): { [P in keyof T]: P extends K ? Exclude<T[P], undefined> | null : T[P] } {
  const out = { ...data } as Record<string, unknown>;
  for (const key of keys) {
    out[key as string] = data[key] ?? null;
  }
  return out as never;
}
