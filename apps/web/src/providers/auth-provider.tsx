"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout as logoutRequest } from "@/features/auth/api";
import type { CurrentUser } from "@/features/auth/types";
import { setUnauthorizedHandler } from "@/lib/api";

export const ME_QUERY_KEY = ["auth", "me"] as const;

interface AuthContextValue {
  user: CurrentUser | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Set when /me could not be answered at all (network/server failure), as opposed to "signed out". */
  error: Error | null;
  /** True once an API call returned 401 while the user believed they were signed in. */
  sessionExpired: boolean;
  refreshUser: () => Promise<unknown>;
  retry: () => Promise<unknown>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionExpired, setSessionExpired] = useState(false);

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Business data cached under one identity must never be shown to the next.
  const dropBusinessData = useCallback(() => {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (queryClient.getQueryData(ME_QUERY_KEY)) {
        setSessionExpired(true);
        dropBusinessData();
        queryClient.setQueryData(ME_QUERY_KEY, null);
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient, dropBusinessData]);

  const refreshUser = useCallback(async () => {
    setSessionExpired(false);
    dropBusinessData();
    return refetch();
  }, [dropBusinessData, refetch]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setSessionExpired(false);
      dropBusinessData();
      queryClient.setQueryData(ME_QUERY_KEY, null);
    }
  }, [dropBusinessData, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      roles: user?.roles ?? [],
      permissions: user?.permissions ?? [],
      isLoading,
      isAuthenticated: !!user,
      error: error ?? null,
      sessionExpired,
      refreshUser,
      retry: refetch,
      logout,
    }),
    [user, isLoading, error, sessionExpired, refreshUser, refetch, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
