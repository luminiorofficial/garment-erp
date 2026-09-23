/**
 * Permission codes follow a `resource.action` naming convention and are the
 * authoritative list this phase seeds into the `permissions` table — the
 * database row (not this list) is what `requirePermission` checks against
 * at runtime. This module exists so both apps/api's seed script and any
 * frontend permission-gated UI reference the same literal strings instead
 * of typo-prone inline literals.
 *
 * Add new codes here only when a real route enforces them — do not
 * pre-create permissions for modules that don't exist yet (e.g. no
 * `orders.*` codes until the orders module is built).
 */
export const PermissionCode = {
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_ASSIGN_ROLE: "users.assign_role",

  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_ASSIGN_PERMISSION: "roles.assign_permission",

  PERMISSIONS_VIEW: "permissions.view",
} as const;

export type PermissionCode = (typeof PermissionCode)[keyof typeof PermissionCode];
