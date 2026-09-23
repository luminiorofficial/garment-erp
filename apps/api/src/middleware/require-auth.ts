import { createMiddleware } from "hono/factory";
import { ApiErrors } from "../lib/api-error.js";
import { getSessionToken, resolveSession } from "../lib/session.js";
import type { AppEnv } from "../types/hono.js";

export const requireAuthenticatedUser = createMiddleware<AppEnv>(
  async (c, next) => {
    const token = getSessionToken(c);
    const resolved = token ? await resolveSession(token) : null;

    if (!resolved) {
      throw ApiErrors.unauthenticated();
    }

    c.set("user", {
      id: resolved.user.id,
      email: resolved.user.email,
      firstName: resolved.user.firstName,
      lastName: resolved.user.lastName,
    });

    await next();
  }
);
