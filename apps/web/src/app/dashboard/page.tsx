"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (isLoading || !user) {
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
