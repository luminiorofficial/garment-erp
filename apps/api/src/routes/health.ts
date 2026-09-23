import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ status: "ok", database: "connected" });
  } catch {
    return c.json(
      { status: "degraded", database: "unreachable" },
      503
    );
  }
});
