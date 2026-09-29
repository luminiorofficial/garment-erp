import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Handshake,
  Package,
  Palette,
  Ruler,
  Scale,
  ShieldCheck,
  Shirt,
  Truck,
  Users,
  Workflow,
} from "lucide-react";
import { PermissionCode } from "@garment-erp/shared";

export interface NavItem {
  label: string;
  href: string;
  permission: PermissionCode;
  icon: LucideIcon;
  /** Screen not built yet: shown (to permitted users) as a disabled entry. */
  comingSoon?: boolean;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

// Only screens that exist belong here. Dashboard has no permission: every
// signed-in user lands there.
export const DASHBOARD_HREF = "/dashboard";

export const MASTER_DATA_GROUP = "Master Data";

export const NAV_GROUPS: NavGroup[] = [
  {
    label: MASTER_DATA_GROUP,
    items: [
      { label: "Customers", href: "/masters/customers", permission: PermissionCode.CUSTOMERS_VIEW, icon: Building2 },
      { label: "Suppliers", href: "/masters/suppliers", permission: PermissionCode.SUPPLIERS_VIEW, icon: Truck },
      { label: "Job Workers", href: "/masters/job-workers", permission: PermissionCode.JOB_WORKERS_VIEW, icon: Handshake },
      { label: "Products", href: "/masters/products", permission: PermissionCode.PRODUCTS_VIEW, icon: Package },
      { label: "Styles", href: "/masters/styles", permission: PermissionCode.STYLES_VIEW, icon: Shirt },
      { label: "Sizes", href: "/masters/sizes", permission: PermissionCode.SIZES_VIEW, icon: Ruler },
      { label: "Colors", href: "/masters/colors", permission: PermissionCode.COLORS_VIEW, icon: Palette },
      { label: "Processes", href: "/masters/processes", permission: PermissionCode.PROCESSES_VIEW, icon: Workflow },
      { label: "Units", href: "/masters/units", permission: PermissionCode.UNITS_VIEW, icon: Scale },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users",
        href: "/administration/users",
        permission: PermissionCode.USERS_VIEW,
        icon: Users,
        comingSoon: true,
      },
      {
        label: "Roles",
        href: "/administration/roles",
        permission: PermissionCode.ROLES_VIEW,
        icon: ShieldCheck,
        comingSoon: true,
      },
    ],
  },
];

/** Groups reduced to what this user may see; empty groups disappear. */
export function visibleNavGroups(permissions: readonly string[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);
}

/** Breadcrumb labels for known path segments; anything else (an id) reads as "Details". */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  masters: "Masters",
  administration: "Administration",
  customers: "Customers",
  suppliers: "Suppliers",
  "job-workers": "Job Workers",
  products: "Products",
  styles: "Styles",
  sizes: "Sizes",
  colors: "Colors",
  processes: "Processes",
  units: "Units",
  users: "Users",
  roles: "Roles",
};

export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbsFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const known = SEGMENT_LABELS[segment];
    const href = "/" + segments.slice(0, index + 1).join("/");
    // "masters" and "administration" have no page of their own.
    const linkable = !isLast && segment !== "masters" && segment !== "administration";
    return { label: known ?? "Details", href: linkable ? href : undefined };
  });
}
