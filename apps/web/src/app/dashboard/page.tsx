"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, apiFetch } from "@/lib/api";

interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CurrentUser>("/api/auth/me")
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError("Could not load the current user");
      });
  }, [router]);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (error) {
    return <p className="p-8 text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!user) {
    return <p className="p-8 text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold text-black dark:text-white">
        Welcome, {user.firstName} {user.lastName}
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>

      <div>
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Roles</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {user.roles.length > 0 ? user.roles.join(", ") : "No roles assigned"}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Permissions</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {user.permissions.length > 0 ? user.permissions.join(", ") : "No permissions granted"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="w-fit rounded border border-black/10 px-4 py-2 text-sm dark:border-white/10"
      >
        Sign out
      </button>
    </div>
  );
}
