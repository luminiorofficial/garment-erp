/**
 * Idempotent bootstrap seed: foundational roles, permissions, the owner
 * role's full permission grant, and (only if ADMIN_EMAIL/ADMIN_PASSWORD are
 * set) a single bootstrap admin user. Safe to re-run — every insert is
 * upsert-by-unique-code or skips if the row already exists. Not run
 * automatically on server startup; invoke explicitly with `pnpm db:seed`.
 */
import { eq } from "drizzle-orm";
import { PermissionCode, Role } from "@garment-erp/shared";
import { db } from "./client.js";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
  processes,
  units,
} from "./schema/index.js";
import { hashPassword } from "../lib/password.js";
import { normalizeEmail } from "../lib/normalize-email.js";

const ROLE_DEFINITIONS: Record<string, { name: string; description: string }> =
  {
    [Role.OWNER]: {
      name: "Owner / Super Admin",
      description: "Full system and business control.",
    },
    [Role.MANAGEMENT]: {
      name: "Management",
      description: "Dashboard, approvals and reports.",
    },
    [Role.SALES]: {
      name: "Sales / Merchandising",
      description: "Customers, orders, samples and customer communication.",
    },
    [Role.PRODUCTION_MANAGER]: {
      name: "Production Manager",
      description: "Production orders, planning, targets and WIP.",
    },
    [Role.PURCHASE_MANAGER]: {
      name: "Purchase Manager",
      description: "Material requirements, suppliers and purchase orders.",
    },
    [Role.WAREHOUSE_MANAGER]: {
      name: "Warehouse Manager",
      description: "Inward, rolls, stock, issues, returns and transfers.",
    },
    [Role.CUTTING_SUPERVISOR]: {
      name: "Cutting Supervisor",
      description: "Cutting plans, fabric issue, cutting and bundles.",
    },
    [Role.JOB_WORK_MANAGER]: {
      name: "Job Work Manager",
      description: "External processing and reconciliation.",
    },
    [Role.LINE_SUPERVISOR]: {
      name: "Line Supervisor",
      description: "Internal production and daily output.",
    },
    [Role.QC_INSPECTOR]: {
      name: "QC Inspector",
      description: "Inspection, defects, rework and rejection.",
    },
    [Role.PACKING_OPERATOR]: {
      name: "Packing Operator",
      description: "Packing and cartons.",
    },
    [Role.DISPATCH_USER]: {
      name: "Dispatch User",
      description: "Shipments and delivery.",
    },
    [Role.ACCOUNTS]: {
      name: "Accounts",
      description: "Bills, invoices, payments, expenses and costing.",
    },
    [Role.VIEWER]: { name: "Viewer", description: "Read-only access." },
  };

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PermissionCode.UNITS_VIEW]: "View units",
  [PermissionCode.UNITS_CREATE]: "Create units",
  [PermissionCode.UNITS_EDIT]: "Edit units",

  [PermissionCode.SIZES_VIEW]: "View sizes",
  [PermissionCode.SIZES_CREATE]: "Create sizes",
  [PermissionCode.SIZES_EDIT]: "Edit/deactivate sizes",
  [PermissionCode.COLORS_VIEW]: "View colors",
  [PermissionCode.COLORS_CREATE]: "Create colors",
  [PermissionCode.COLORS_EDIT]: "Edit/deactivate colors",
  [PermissionCode.PRODUCTS_VIEW]: "View products",
  [PermissionCode.PRODUCTS_CREATE]: "Create products",
  [PermissionCode.PRODUCTS_EDIT]: "Edit/deactivate products",
  [PermissionCode.STYLES_VIEW]: "View styles and their versions",
  [PermissionCode.STYLES_CREATE]: "Create styles",
  [PermissionCode.STYLES_EDIT]:
    "Edit/deactivate styles, change allowed sizes/colors and create style versions",

  [PermissionCode.PROCESSES_VIEW]: "View processes",
  [PermissionCode.PROCESSES_CREATE]: "Create processes",
  [PermissionCode.PROCESSES_EDIT]: "Edit processes",

  [PermissionCode.USERS_VIEW]: "View users",
  [PermissionCode.USERS_CREATE]: "Create users",
  [PermissionCode.USERS_EDIT]: "Edit users",
  [PermissionCode.USERS_ASSIGN_ROLE]: "Assign/remove a user's roles",
  [PermissionCode.ROLES_VIEW]: "View roles",
  [PermissionCode.ROLES_CREATE]: "Create roles",
  [PermissionCode.ROLES_EDIT]: "Edit roles",
  [PermissionCode.ROLES_ASSIGN_PERMISSION]:
    "Assign/remove a role's permissions",
  [PermissionCode.PERMISSIONS_VIEW]: "View permissions",
  [PermissionCode.CUSTOMERS_VIEW]: "View customers and their contacts",
  [PermissionCode.CUSTOMERS_CREATE]: "Create customers and customer contacts",
  [PermissionCode.CUSTOMERS_EDIT]:
    "Edit/deactivate customers and edit customer contacts",
  [PermissionCode.SUPPLIERS_VIEW]: "View suppliers and their contacts",
  [PermissionCode.SUPPLIERS_CREATE]: "Create suppliers and supplier contacts",
  [PermissionCode.SUPPLIERS_EDIT]:
    "Edit/deactivate suppliers and edit supplier contacts",
  [PermissionCode.JOB_WORKERS_VIEW]: "View job workers",
  [PermissionCode.JOB_WORKERS_CREATE]: "Create job workers",
  [PermissionCode.JOB_WORKERS_EDIT]: "Edit/deactivate job workers",
};

async function seedRoles() {
  for (const [code, def] of Object.entries(ROLE_DEFINITIONS)) {
    await db
      .insert(roles)
      .values({
        code,
        name: def.name,
        description: def.description,
        isSystem: true,
      })
      .onConflictDoNothing({ target: roles.code });
  }
  console.log(`Seeded ${Object.keys(ROLE_DEFINITIONS).length} roles`);
}

async function seedPermissions() {
  for (const code of Object.values(PermissionCode)) {
    const [resource, action] = code.split(".");
    await db
      .insert(permissions)
      .values({
        code,
        resource: resource ?? code,
        action: action ?? code,
        description: PERMISSION_DESCRIPTIONS[code],
      })
      .onConflictDoNothing({ target: permissions.code });
  }
  console.log(`Seeded ${Object.values(PermissionCode).length} permissions`);
}

async function grantOwnerAllPermissions() {
  const [ownerRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.code, Role.OWNER))
    .limit(1);
  if (!ownerRole) throw new Error("Owner role missing after seed");

  const allPermissions = await db.select().from(permissions);

  for (const permission of allPermissions) {
    await db
      .insert(rolePermissions)
      .values({ roleId: ownerRole.id, permissionId: permission.id })
      .onConflictDoNothing();
  }
  console.log(`Granted ${allPermissions.length} permissions to owner role`);
}

async function seedBootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping bootstrap admin user",
    );
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    console.log("Bootstrap admin user already exists — skipping");
    return;
  }

  const [ownerRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.code, Role.OWNER))
    .limit(1);
  if (!ownerRole) throw new Error("Owner role missing after seed");

  const passwordHash = await hashPassword(password);

  const [admin] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      firstName: "Admin",
      lastName: "User",
    })
    .returning();

  if (!admin) throw new Error("Failed to create bootstrap admin user");

  await db.insert(userRoles).values({ userId: admin.id, roleId: ownerRole.id });

  console.log(`Created bootstrap admin user: ${normalizedEmail}`);
}

async function main() {
  await db
    .insert(processes)
    .values([
      { code: "CUTTING", name: "Cutting" },
      { code: "STITCHING", name: "Stitching" },
      { code: "EMBROIDERY", name: "Embroidery" },
      { code: "PRINTING", name: "Printing" },
      { code: "WASHING", name: "Washing" },
      { code: "FINISHING", name: "Finishing" },
    ])
    .onConflictDoNothing({ target: processes.code });
  await db
    .insert(units)
    .values([
      { code: "PCS", name: "Pieces", symbol: "pcs", decimalPlaces: 0 },
      { code: "KG", name: "Kilograms", symbol: "kg", decimalPlaces: 3 },
      { code: "MTR", name: "Meters", symbol: "m", decimalPlaces: 3 },
      { code: "YDS", name: "Yards", symbol: "yd", decimalPlaces: 3 },
      { code: "BOX", name: "Boxes", decimalPlaces: 0 },
      { code: "SET", name: "Sets", decimalPlaces: 0 },
      { code: "ROLL", name: "Rolls", decimalPlaces: 0 },
    ])
    .onConflictDoNothing({ target: units.code });
  await seedRoles();
  await seedPermissions();
  await grantOwnerAllPermissions();
  await seedBootstrapAdmin();
  console.log("Seed complete");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
