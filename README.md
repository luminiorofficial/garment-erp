# garment-erp

Garment manufacturing management & accountability ERP. Monorepo containing
an independently deployable frontend (`apps/web`) and backend (`apps/api`),
plus small shared packages. See [docs/architecture.md](docs/architecture.md)
and [docs/decisions](docs/decisions/) for how this is put together and why.

## Prerequisites

- Node.js >= 20.9
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (for local PostgreSQL)

## Getting started

```bash
pnpm install

# start local PostgreSQL
docker compose -f infrastructure/docker/docker-compose.yml up -d

# copy env files and fill in as needed
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

pnpm dev        # runs apps/web and apps/api together
pnpm build      # builds every app/package
pnpm lint       # lints every app/package
pnpm typecheck  # type-checks every app/package
```

`apps/web` runs on http://localhost:3000, `apps/api` on http://localhost:4000
(`GET /health` checks the API and database are both reachable).

## Layout

```
apps/web        Next.js ERP frontend
apps/api        Independent backend (Node + Hono + Drizzle + PostgreSQL)
packages/shared     Cross-cutting enums/types/constants
packages/validation Shared zod contracts
packages/config     Shared tsconfig base
infrastructure  Local Postgres (Docker Compose) and future deployment assets
docs            Architecture docs and ADRs
scripts         Repo-wide automation
```

This is architecture scaffolding only — no ERP modules (orders, inventory,
BOM, purchasing, production, QC, packing, dispatch, ...) are implemented yet.
