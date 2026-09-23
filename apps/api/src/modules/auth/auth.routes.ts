import { Hono } from "hono";
import { loginSchema } from "@garment-erp/validation";
import { requireAuthenticatedUser } from "../../middleware/require-auth.js";
import { getRequestMeta } from "../../lib/request-context.js";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "../../lib/session.js";
import type { AppEnv } from "../../types/hono.js";
import { getCurrentUser, login, logout } from "./auth.service.js";

export const authRoute = new Hono<AppEnv>();

authRoute.post("/login", async (c) => {
  const input = loginSchema.parse(await c.req.json());
  const { token, expiresAt, user } = await login(input, getRequestMeta(c));
  setSessionCookie(c, token, expiresAt);
  return c.json({ user });
});

authRoute.post("/logout", async (c) => {
  const token = getSessionToken(c);
  if (token) {
    await logout(token, getRequestMeta(c));
  }
  clearSessionCookie(c);
  return c.body(null, 204);
});

authRoute.get("/me", requireAuthenticatedUser, async (c) => {
  const user = c.get("user");
  const fullUser = await getCurrentUser(user.id);
  return c.json(fullUser);
});
