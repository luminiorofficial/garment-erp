import { ApiClientError, apiFetch, jsonBody } from "@/lib/api";
import type { CurrentUser, LoginInput } from "./types";

/** Resolves to null when nobody is signed in; other failures (network, 5xx) still throw. */
export async function getMe(): Promise<CurrentUser | null> {
  try {
    return await apiFetch<CurrentUser>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null;
    throw error;
  }
}

export function login(input: LoginInput) {
  return apiFetch<{ user: Pick<CurrentUser, "id" | "email" | "firstName" | "lastName"> }>(
    "/api/auth/login",
    { method: "POST", ...jsonBody(input) }
  );
}

export function logout() {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}
