import type { Context } from "hono";

export function getRequestMeta(c: Context) {
  return {
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
  };
}
