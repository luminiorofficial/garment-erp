# 005 — Primary keys: UUID, generated application-side

## Status

Accepted

## Context

The blueprint requires database IDs to be separate from human-readable
business document numbers (e.g. `PO-2026-000123`), and calls for a single,
documented PK strategy rather than an ad hoc mix.

## Decision

Every table's primary key is a UUID (v4), generated in application code via
Node's built-in `crypto.randomUUID()` as a Drizzle `$defaultFn` — not a
Postgres extension (`gen_random_uuid()`/`uuid-ossp`/`pgcrypto`). Human-
readable document numbers (once modules that need them exist — POs,
dispatch notes, etc.) are a separate, independently-generated field, never
the primary key.

## Consequences

- Keeps the Postgres image/config plain (`infrastructure/docker/docker-compose.yml`
  needs no extension setup) — one less thing to get wrong across dev,
  CI, and production databases.
- IDs are generated before the INSERT executes, so application code can
  reference a new row's id (e.g. for an audit log entry in the same
  transaction) without a round-trip `RETURNING` just to get the id, though
  we still use `.returning()` where we need the full row back.
- UUID v4 has no time-ordering, so ranges/indexes on `id` itself don't
  cluster by insertion order the way UUIDv7 or a bigint sequence would;
  every table that benefits from time-ordered scans already has a proper
  `created_at` timestamp for that, so this hasn't mattered in practice. If
  a future table's write volume makes UUID v4 index bloat a real problem,
  revisit with UUIDv7 (`crypto.randomUUID()` has no v7 mode; would need a
  small library) for that table specifically — not a repo-wide change.
