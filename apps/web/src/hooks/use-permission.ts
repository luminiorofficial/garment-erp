import { useAuth } from "@/providers/auth-provider";

export function usePermission(code: string) {
  const { permissions } = useAuth();
  return permissions.includes(code);
}
