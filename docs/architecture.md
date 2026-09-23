# Architecture

This repository is a pnpm + Turborepo monorepo for the garment manufacturing ERP.
It is a monorepo, not a monolith: `apps/web` and `apps/api` are independently
deployable services that happen to share tooling and a small set of packages.

## Layout

```
apps/
  web/          Next.js App Router frontend. No DB access, no business rules.
  api/          Independent backend (Node + Hono + Drizzle + PostgreSQL).
packages/
  shared/       Cross-cutting enums/types/constants used by both apps.
  validation/   Shared zod schemas for request/response contracts.
  config/       Shared tsconfig base. (packages/ui will be added once the
                frontend has real reusable components to extract.)
infrastructure/ Local Postgres via Docker Compose; deployment assets later.
docs/           This file, plus Architecture Decision Records.
scripts/        Repo-wide automation (empty until there's something to automate).
```

## Dependency rules

```
apps/web -> packages/shared, packages/validation, packages/config
apps/api -> packages/shared, packages/validation, packages/config
packages/shared -> (nothing internal)
packages/validation -> packages/shared
packages/config -> (nothing)
```

- `apps/web` must never import `apps/api` code or any database/ORM code.
- `apps/api` must never import `apps/web` code.
- Database schema, migrations, and the Drizzle client live only in
  `apps/api/src/db` — see [003-database-ownership](decisions/003-database-ownership.md).
- Backend authorization is authoritative. The frontend hides actions the
  current user cannot perform; the backend re-checks every permission
  regardless of what the UI sent.

## The core ERP rule

Whenever something physically moves in the factory (fabric, a cut bundle, a
carton), the system records a transaction: what moved, how much, from where,
to where, for which order, by whom, when, under which approval. Inventory is
never a directly-editable `current_stock` field — it is always derived from
(or reconciled against) a transaction log. This governs every future module
under `apps/api` and is why the database owns explicit `*_transactions`,
`*_movements`, and `audit_logs` tables rather than mutable balance columns.

## Status

This is architecture only — no ERP modules (orders, inventory, BOM, purchase,
production, QC, packing, ...) are implemented yet. `apps/api` currently
exposes a single `/health` endpoint that verifies Postgres connectivity, to
prove the wiring works end to end before any domain code is written.

See [docs/decisions](decisions/) for the reasoning behind the major choices.
