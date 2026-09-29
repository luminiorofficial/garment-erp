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

  it("does not grant view access from create/edit permissions alone", () => {
    expect(visibleNavGroups([PermissionCode.CUSTOMERS_CREATE, PermissionCode.CUSTOMERS_EDIT])).toEqual([]);
  });

  it("lists administration entries as coming soon", () => {
    const admin = visibleNavGroups([PermissionCode.USERS_VIEW]).find((g) => g.label === "Administration");
    expect(admin?.items.every((i) => i.comingSoon)).toBe(true);
  });
});

describe("breadcrumbsFor", () => {
  it("labels known segments and treats an id as Details", () => {
    expect(breadcrumbsFor("/masters/customers/6f1c")).toEqual([
      { label: "Masters", href: undefined },
      { label: "Customers", href: "/masters/customers" },
      { label: "Details", href: undefined },
    ]);
  });
});
