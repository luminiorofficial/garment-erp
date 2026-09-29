import type { PermissionCode } from "@garment-erp/shared";
import { useAuth } from "@/providers/auth-provider";

/**
 * UX-only check used to hide or disable controls. The API enforces every
 * permission again, so a stale or tampered client can never gain access.
 */
export function usePermission(code: PermissionCode) {
  const { permissions } = useAuth();
  return permissions.includes(code);
}
