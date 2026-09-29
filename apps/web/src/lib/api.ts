const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// Auth endpoints where a 401 is an expected answer rather than an expired
// session: /me answers 401 to "nobody is signed in", login to bad credentials.
const UNAUTHORIZED_EXEMPT_PATHS = ["/api/auth/login", "/api/auth/me"];

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** AuthProvider registers this so any 401 mid-session ends the session in one place. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Builds `?a=1&b=2`, dropping undefined/null/empty values. */
export function buildQuery(params: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the server. Check your connection and try again."
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { code: string; message: string } }
      | null;

    if (res.status === 401 && !UNAUTHORIZED_EXEMPT_PATHS.includes(path)) {
      unauthorizedHandler?.();
    }

    throw new ApiClientError(
      res.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? `Request failed (${res.status})`
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function jsonBody(value: unknown): RequestInit {
  return { body: JSON.stringify(value) };
}

/** Message safe to show users: the API's own message when there is one. */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403) return "You do not have permission to do this.";
    return error.message;
  }
  return fallback;
}
