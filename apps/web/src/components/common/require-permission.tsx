"use client";

import type { PermissionCode } from "@garment-erp/shared";
import { usePermission } from "@/hooks/use-permission";
import { NoAccessState } from "./states";

/**
 * UX guard for a whole page. It only avoids showing a screen whose API calls
 * would all be rejected — the API remains the authority.
 */
export function RequirePermission({
  permission,
  what,
  children,
}: {
  permission: PermissionCode;
  what: string;
  children: React.ReactNode;
}) {
  const allowed = usePermission(permission);
  if (!allowed) return <NoAccessState what={what} />;
  return <>{children}</>;
}
