import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { ApiError } from "../lib/api-error.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status as 401 | 403 | 404 | 409 | 422);
  }

  if (err instanceof ZodError) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: err.issues[0]?.message ?? "Invalid input" } },
      422
    );
  }

  // Never leak SQL errors, stack traces, or internal details to the client.
  console.error(err);
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    500
  );
};
