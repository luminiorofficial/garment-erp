import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiFetch, buildQuery, setUnauthorizedHandler } from "./api";

describe("buildQuery", () => {
  it("drops empty values and keeps false/0", () => {
    expect(buildQuery({ page: 1, search: undefined, isActive: false, q: "" })).toBe(
      "?page=1&isActive=false"
    );
    expect(buildQuery({})).toBe("");
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  const stubFetch = (status: number, body: unknown) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status }))
    );

  it("surfaces the API's own error message", async () => {
    stubFetch(409, { error: { code: "CONFLICT", message: "Customer code already exists" } });
    await expect(apiFetch("/api/customers")).rejects.toMatchObject({
      status: 409,
      message: "Customer code already exists",
    });
  });

  it("notifies the session handler on 401 from a business endpoint only", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(401, { error: { code: "AUTH_REQUIRED", message: "Authentication required" } });

    await expect(apiFetch("/api/customers")).rejects.toBeInstanceOf(ApiClientError);
    expect(handler).toHaveBeenCalledTimes(1);

    await expect(apiFetch("/api/auth/me")).rejects.toBeInstanceOf(ApiClientError);
    await expect(apiFetch("/api/auth/login")).rejects.toBeInstanceOf(ApiClientError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("reports an unreachable server as a network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });
});
