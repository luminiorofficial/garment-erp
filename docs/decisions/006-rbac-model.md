# 006 — RBAC model: users ↔ roles ↔ permissions, resource.action codes

## Status

Accepted

## Context

The blueprint requires many-to-many role assignment (a user may hold
multiple responsibilities), resource-specific permissions rather than a
single global View/Edit flag, and backend-authoritative authorization.

## Decision

Four tables: `users`, `roles`, `permissions`, plus join tables `user_roles`
and `role_permissions` (composite primary keys, no surrogate id — the pair
itself is the natural key and prevents duplicate assignments). No `role`
column on `users`.

Permission codes follow `resource.action` (e.g. `users.assign_role`,
`roles.view`), defined once in `packages/shared/src/permissions.ts` and
seeded into the `permissions` table by `apps/api/src/db/seed.ts`. Only
codes with a real enforcing route exist — no speculative `orders.*` codes
before the orders module exists.

`requireAuthenticatedUser` (resolves the session, attaches the user) always
runs before `requirePermission(code)` (computes the user's permission set
via one join query, cached on the request context, 403s if the code is
missing). Route handlers never hand-roll a permission check.

**Audit logs vs. security events, kept separate:** `audit_logs` records
state changes to entities — who changed what, old value → new value — for
accountability disputes (potentially long retention). `security_events`
records authentication telemetry (login success/failure, logout) — higher
volume, no old/new-value concept, plausibly shorter retention. Conflating
them would force one schema to awkwardly serve two different access
patterns.

**Organization/factory scope deferred.** Nothing in this phase's
permission checks has a "for which factory" dimension — it's purely "does
this user have this permission code." Adding `companies`/`factories` now,
with zero consumers, would be exactly the premature scaffolding the
blueprint warns against. It belongs with the first module that actually
needs scoped authorization (e.g. warehouses) — at that point, extend
`role_permissions` or add a scoping table, don't guess the shape now.

## Consequences

- A user's permission set is always current — no caching beyond the
  single request being served — so a role/permission change takes effect
  on the user's *next* request, not after a token expires.
- Seed data (`ROLE_DEFINITIONS` in `seed.ts`) reuses the same role codes as
  `packages/shared`'s `Role` enum, so the seeded database and any future
  frontend role-based UI can't drift apart on spelling.
- When factory/warehouse scoping does get added, expect it to touch
  `requirePermission` (to also check scope) and possibly `role_permissions`
  or a new scoping join table — not `users`/`roles`/`permissions`
  themselves, which stay scope-agnostic.
