import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api-error.js";

const { getSessionToken, resolveSession } = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  resolveSession: vi.fn(),
}));

vi.mock("../lib/session.js", () => ({ getSessionToken, resolveSession }));

const { requireAuthenticatedUser } = await import("./require-auth.js");

function makeContext() {
  const store = new Map<string, unknown>();
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => store.set(key, value),
  } as never;
}

describe("requireAuthenticatedUser", () => {
  beforeEach(() => {
    getSessionToken.mockReset();
    resolveSession.mockReset();
  });

  it("rejects when there is no session cookie", async () => {
    getSessionToken.mockReturnValue(undefined);
    const next = vi.fn();

    await expect(requireAuthenticatedUser(makeContext(), next)).rejects.toBeInstanceOf(ApiError);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when the session token does not resolve (expired, revoked, or inactive user)", async () => {
    getSessionToken.mockReturnValue("some-token");
    resolveSession.mockResolvedValue(null);
    const next = vi.fn();

    await expect(requireAuthenticatedUser(makeContext(), next)).rejects.toBeInstanceOf(ApiError);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the user and calls next on a valid session", async () => {
    getSessionToken.mockReturnValue("some-token");
    resolveSession.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", firstName: "A", lastName: "B" },
      session: { id: "s1" },
    });
    const c = makeContext();
    const next = vi.fn();

    await requireAuthenticatedUser(c, next);

    expect(next).toHaveBeenCalledOnce();
    expect((c as { get: (k: string) => unknown }).get("user")).toEqual({
      id: "u1",
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
    });
  });
});
