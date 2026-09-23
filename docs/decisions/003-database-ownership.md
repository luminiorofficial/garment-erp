# 003 — Database ownership lives in apps/api, not packages/db

## Status

Accepted

## Context

The blueprint's default monorepo sketch suggests a top-level `packages/db`
for schema/migrations. PostgreSQL is the chosen database, and the chosen
backend uses Drizzle ORM, whose schema-as-TypeScript convention lives
naturally next to the code that uses it. Only `apps/api` ever talks to
Postgres — `apps/web` consumes data exclusively through `apps/api`'s HTTP
contracts.

## Decision

Database schema, migrations, seeds, and the Drizzle client live in
`apps/api/src/db/` and nowhere else:

```
apps/api/src/db/
  schema/       One file per domain area (orders.ts, inventory.ts, ...),
                re-exported from schema/index.ts.
  migrations/   drizzle-kit generated SQL migrations.
  client.ts     The single Drizzle client.
```

There is exactly one owner of the schema. No package or app outside
`apps/api` may define tables, run migrations, or hold a database
connection.

## Consequences

- Satisfies the non-negotiable rule against duplicated database schemas:
  there is only ever one place a table can be defined.
- If a second runtime ever needs direct database access (e.g. a future
  `apps/worker` for background jobs), the correct move at that point is to
  extract `apps/api/src/db` into `packages/db` — not to pre-create an empty
  `packages/db` now on the assumption it will be needed.
- Inventory, WIP, and material-movement tables are transaction-driven per
  the blueprint's core rule (every physical movement is a traceable
  transaction) — there is no directly-editable `current_stock` column.
  This is enforced by how the schema is modeled, not by application-layer
  discipline alone.
