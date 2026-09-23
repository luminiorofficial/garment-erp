# 001 — Monorepo with pnpm + Turborepo

## Status

Accepted

## Context

The repository started as a single Next.js app at the root. The product
blueprint requires a dedicated, independently deployable backend, plus
several small shared packages (types, validation, config). We need one
place to coordinate them without losing independent deployability.

## Decision

Use a single git repository structured as a pnpm workspace, orchestrated by
Turborepo, with `apps/*` for deployable applications and `packages/*` for
internal libraries. The root `package.json` is a workspace coordinator only
— it holds no application code or runtime dependencies of its own.

## Consequences

- One repository, one issue tracker, one PR history for a still-small team.
- `apps/web` and `apps/api` remain independently runnable and independently
  deployable; the monorepo only shares tooling and code, not deployment.
- Turborepo caches `build`/`lint`/`typecheck` per package, so the cost of
  the monorepo grows sub-linearly as more apps/packages are added.
- We accept the operational overhead of a workspace tool (pnpm) and a task
  runner (Turborepo) in exchange for not duplicating config and contracts
  across repositories.
