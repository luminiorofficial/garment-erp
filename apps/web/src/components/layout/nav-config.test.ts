import { describe, expect, it } from "vitest";
import { PermissionCode } from "@garment-erp/shared";
import { breadcrumbsFor, visibleNavGroups } from "./nav-config";

describe("visibleNavGroups", () => {
  it("shows nothing to a user with no permissions", () => {
    expect(visibleNavGroups([])).toEqual([]);
  });

  it("shows only the entries the user may view, and drops empty groups", () => {
    const groups = visibleNavGroups([PermissionCode.CUSTOMERS_VIEW, PermissionCode.UNITS_VIEW]);
    expect(groups.map((g) => g.label)).toEqual(["Masters"]);
    expect(groups[0]?.items.map((i) => i.label)).toEqual(["Customers", "Units"]);
  });

  it("lists the product/style masters in a logical order, each behind its own view permission", () => {
    const all = visibleNavGroups([
      PermissionCode.CUSTOMERS_VIEW,
      PermissionCode.SUPPLIERS_VIEW,
      PermissionCode.JOB_WORKERS_VIEW,
      PermissionCode.PRODUCTS_VIEW,
      PermissionCode.STYLES_VIEW,
      PermissionCode.SIZES_VIEW,
      PermissionCode.COLORS_VIEW,
      PermissionCode.PROCESSES_VIEW,
      PermissionCode.UNITS_VIEW,
    ]);
    expect(all[0]?.items.map((i) => i.label)).toEqual([
      "Customers",
      "Suppliers",
      "Job Workers",
      "Products",
      "Styles",
      "Sizes",
      "Colors",
      "Processes",
      "Units",
    ]);
    const onlyStyles = visibleNavGroups([PermissionCode.STYLES_VIEW, PermissionCode.SIZES_EDIT]);
    expect(onlyStyles[0]?.items.map((i) => i.label)).toEqual(["Styles"]);
  });

  it("does not grant view access from create/edit permissions alone", () => {
    expect(visibleNavGroups([PermissionCode.CUSTOMERS_CREATE, PermissionCode.CUSTOMERS_EDIT])).toEqual([]);
  });

  it("lists administration entries as coming soon", () => {
    const admin = visibleNavGroups([PermissionCode.USERS_VIEW]).find((g) => g.label === "Administration");
    expect(admin?.items.every((i) => i.comingSoon)).toBe(true);
  });
});

describe("breadcrumbsFor", () => {
  it("labels the new masters", () => {
    expect(breadcrumbsFor("/masters/styles").map((c) => c.label)).toEqual(["Masters", "Styles"]);
    expect(breadcrumbsFor("/masters/sizes")[1]?.label).toBe("Sizes");
    expect(breadcrumbsFor("/masters/colors")[1]?.label).toBe("Colors");
    expect(breadcrumbsFor("/masters/products/x")[1]?.label).toBe("Products");
  });

  it("labels known segments and treats an id as Details", () => {
    expect(breadcrumbsFor("/masters/customers/6f1c")).toEqual([
      { label: "Masters", href: undefined },
      { label: "Customers", href: "/masters/customers" },
      { label: "Details", href: undefined },
    ]);
  });
});
