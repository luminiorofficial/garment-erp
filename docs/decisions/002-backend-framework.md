# 002 — Backend framework: Node + Hono + Drizzle (not ASP.NET Core)

## Status

Accepted

## Context

The product blueprint's first-choice stack is Next.js + ASP.NET Core +
PostgreSQL, with Next.js + Bun/Hono + PostgreSQL offered as an alternative
"for a solo TypeScript developer." This repository, at the time of this
decision, is a single-contributor TypeScript project with no existing
backend code.

ASP.NET Core brings mature enterprise patterns for authorization and
transactions, but introduces a second language and toolchain before a single
ERP screen exists, and prevents `packages/shared` / `packages/validation`
from being literally shared *code* (only shared conventions, re-implemented
twice).

## Decision

`apps/api` is a Node.js service using Hono for HTTP routing and Drizzle ORM
for PostgreSQL access, written in TypeScript. Internal layering separates
HTTP routes, application/use-case services, domain rules, and infrastructure
(Drizzle repositories) — without an academic number of abstraction layers.

## Consequences

- `packages/shared` and `packages/validation` are consumed as real,
  type-checked TypeScript by both `apps/web` and `apps/api` — no contract
  drift between two languages.
- Background jobs, auth, and authorization will be assembled from
  well-established Node libraries rather than an integrated framework;
  this is more assembly work than ASP.NET Core's batteries-included
  approach, but keeps the whole stack in one language.
- This decision is reversible at the service boundary: `apps/api` is a
  plain REST/JSON service. Replacing its internals with ASP.NET Core later
  (e.g. if the team grows and gains C# expertise) does not require changing
  `apps/web`, the shared packages, or the database schema/migration
  ownership described in [003-database-ownership](003-database-ownership.md).
- If a future team lead wants to revisit this, the trigger condition is:
  the team has hired C#/.NET expertise AND the TypeScript backend's
  authorization/transaction code has become a maintenance burden — not
  "ASP.NET Core is the blueprint's stated preference" alone.
