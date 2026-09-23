import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Repository functions that must participate in a caller's transaction
// accept this. Because it's a union of two differently-instantiated query
// builder types, chained calls (e.g. .insert().returning()) need an
// explicit return type annotation on the repository function — TS cannot
// reliably infer through a union receiver on its own.
export type Executor = Database | Transaction;
