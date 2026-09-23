import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthRoute } from "./routes/health.js";
import { authRoute } from "./modules/auth/auth.routes.js";
import { usersRoute } from "./modules/users/users.routes.js";
import { rolesRoute } from "./modules/roles/roles.routes.js";
import { permissionsRoute } from "./modules/permissions/permissions.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import type { AppEnv } from "./types/hono.js";

const allowedOrigins = (process.env.APP_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

export const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.onError(errorHandler);

app.route("/health", healthRoute);
app.route("/api/auth", authRoute);
app.route("/api/users", usersRoute);
app.route("/api/roles", rolesRoute);
app.route("/api/permissions", permissionsRoute);
