/**
 * Cross-cutting enums shared between apps/web and apps/api.
 * Only add values here once both sides genuinely need the same source of truth —
 * module-specific enums belong next to the module that owns them.
 */

export const Role = {
  OWNER: "owner",
  MANAGEMENT: "management",
  SALES: "sales",
  PRODUCTION_MANAGER: "production_manager",
  PURCHASE_MANAGER: "purchase_manager",
  WAREHOUSE_MANAGER: "warehouse_manager",
  CUTTING_SUPERVISOR: "cutting_supervisor",
  JOB_WORK_MANAGER: "job_work_manager",
  LINE_SUPERVISOR: "line_supervisor",
  QC_INSPECTOR: "qc_inspector",
  PACKING_OPERATOR: "packing_operator",
  DISPATCH_USER: "dispatch_user",
  ACCOUNTS: "accounts",
  VIEWER: "viewer",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const Unit = {
  PCS: "pcs",
  KG: "kg",
  MTR: "mtr",
  YDS: "yds",
  BOX: "box",
  SET: "set",
} as const;

export type Unit = (typeof Unit)[keyof typeof Unit];
