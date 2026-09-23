export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const ApiErrors = {
  invalidCredentials: () =>
    new ApiError(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password"),
  unauthenticated: () =>
    new ApiError(401, "AUTH_REQUIRED", "Authentication required"),
  forbidden: (permission: string) =>
    new ApiError(403, "FORBIDDEN", `Missing permission: ${permission}`),
  notFound: (resource: string) =>
    new ApiError(404, "NOT_FOUND", `${resource} not found`),
  conflict: (message: string) => new ApiError(409, "CONFLICT", message),
  validation: (message: string) => new ApiError(422, "VALIDATION_ERROR", message),
} as const;
