"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { ErrorState } from "@/components/common/states";

export function FullScreenLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center">
      <Skeleton className="h-6 w-40" />
    </div>
  );
}

/**
 * Wraps every ERP page. Nothing protected renders until /me has confirmed a
 * session, and an unauthenticated visitor is sent to /login (remembering where
 * they were headed). The session cookie belongs to the API origin, so this is
 * a client-side gate; the API still rejects every unauthenticated request.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated, error, sessionExpired, retry } = useAuth();

  const redirecting = !isLoading && !isAuthenticated && !error;

  useEffect(() => {
    if (!redirecting) return;
    const params = new URLSearchParams();
    if (sessionExpired) params.set("reason", "expired");
    if (pathname && pathname !== "/dashboard") params.set("next", pathname);
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }, [redirecting, sessionExpired, pathname, router]);

  if (isLoading || redirecting) return <FullScreenLoading />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorState
          title="Cannot verify your session"
          error={error}
          onRetry={() => void retry()}
        />
      </div>
    );
  }

  return <>{children}</>;
}

/** For /login: a signed-in user has no business here. */
export function GuestGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    const next = new URLSearchParams(window.location.search).get("next");
    // Only same-origin absolute paths — never an open redirect.
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    router.replace(safe);
  }, [isAuthenticated, router]);

  if (isLoading || isAuthenticated) return <FullScreenLoading />;
  return <>{children}</>;
}
