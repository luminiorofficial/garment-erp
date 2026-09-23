import { apiFetch } from "@/lib/api";
import type { CurrentUser, LoginInput } from "./types";

export function getMe() {
  return apiFetch<CurrentUser>("/api/auth/me");
}

export function login(input: LoginInput) {
  return apiFetch<{ user: Pick<CurrentUser, "id" | "email" | "firstName" | "lastName"> }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export function logout() {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}
