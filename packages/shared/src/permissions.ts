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

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",

  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_CREATE: "suppliers.create",
  SUPPLIERS_EDIT: "suppliers.edit",

  JOB_WORKERS_VIEW: "job_workers.view",
  JOB_WORKERS_CREATE: "job_workers.create",
  JOB_WORKERS_EDIT: "job_workers.edit",
  PROCESSES_VIEW: "processes.view",
  PROCESSES_CREATE: "processes.create",
  PROCESSES_EDIT: "processes.edit",
  UNITS_VIEW: "units.view",
  UNITS_CREATE: "units.create",
  UNITS_EDIT: "units.edit",

  SIZES_VIEW: "sizes.view",
  SIZES_CREATE: "sizes.create",
  SIZES_EDIT: "sizes.edit",

  COLORS_VIEW: "colors.view",
  COLORS_CREATE: "colors.create",
  COLORS_EDIT: "colors.edit",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",

  // styles.edit also covers creating style versions and changing a style's
  // allowed sizes/colors: neither is an authorisation distinction worth a
  // separate permission yet (approval gets its own when Sampling exists).
  STYLES_VIEW: "styles.view",
  STYLES_CREATE: "styles.create",
  STYLES_EDIT: "styles.edit",
} as const;

export type PermissionCode =
  (typeof PermissionCode)[keyof typeof PermissionCode];
