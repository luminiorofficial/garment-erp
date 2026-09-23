"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout as logoutRequest } from "@/features/auth/api";
import type { CurrentUser } from "@/features/auth/types";

const ME_QUERY_KEY = ["auth", "me"] as const;

interface AuthContextValue {
  user: CurrentUser | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<unknown>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      roles: user?.roles ?? [],
      permissions: user?.permissions ?? [],
      isLoading,
      isAuthenticated: !!user,
      refreshUser: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
      logout: async () => {
        await logoutRequest();
        queryClient.setQueryData(ME_QUERY_KEY, null);
      },
    }),
    [user, isLoading, queryClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
