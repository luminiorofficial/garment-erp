import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api-error.js";

const { getPermissionCodesForUser } = vi.hoisted(() => ({
  getPermissionCodesForUser: vi.fn(),
}));

vi.mock("../modules/roles/roles.repository.js", () => ({
  getPermissionCodesForUser,
}));

const { requirePermission } = await import("./require-permission.js");

function makeContext(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => store.set(key, value),
  } as never;
}

describe("requirePermission", () => {
  beforeEach(() => {
    getPermissionCodesForUser.mockReset();
  });

  it("calls next when the user has the permission", async () => {
    getPermissionCodesForUser.mockResolvedValue(new Set(["users.view"]));
    const middleware = requirePermission("users.view" as never);
    const c = makeContext({ user: { id: "u1" } });
    const next = vi.fn();

    await middleware(c, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("throws a 403 ApiError when the user lacks the permission", async () => {
    getPermissionCodesForUser.mockResolvedValue(new Set(["users.view"]));
    const middleware = requirePermission("users.create" as never);
    const c = makeContext({ user: { id: "u1" } });
    const next = vi.fn();

    await expect(middleware(c, next)).rejects.toBeInstanceOf(ApiError);
    expect(next).not.toHaveBeenCalled();
  });

  it("only fetches permissions once per request (cached on context)", async () => {
    getPermissionCodesForUser.mockResolvedValue(new Set(["users.view", "users.create"]));
    const c = makeContext({ user: { id: "u1" } });
    const next = vi.fn();

    await requirePermission("users.view" as never)(c, next);
    await requirePermission("users.create" as never)(c, next);

    expect(getPermissionCodesForUser).toHaveBeenCalledOnce();
  });
});
