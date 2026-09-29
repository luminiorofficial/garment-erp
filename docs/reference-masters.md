# Process and Unit masters

Both are API-only editable lookup tables, with no enum or DELETE endpoint.

| Resource  | Endpoints                                                 | Permissions                                            |
| --------- | --------------------------------------------------------- | ------------------------------------------------------ |
| Processes | GET/POST `/api/processes`, GET/PATCH `/api/processes/:id` | `processes.view`, `processes.create`, `processes.edit` |
| Units     | GET/POST `/api/units`, GET/PATCH `/api/units/:id`         | `units.view`, `units.create`, `units.edit`             |

Lists accept `page`, `pageSize`, `search`, and `isActive=true|false` and return
`{ items, page, pageSize }`, ordered by code. Search matches code/name and, for
units, symbol. Codes are trimmed, uppercased, 1–50 characters, and accept letters,
digits, hyphens, and underscores, starting with a letter or digit. Names are
required, trimmed, and limited to 200 characters. Empty PATCH requests are rejected.

Process fields: `code`, `name`, optional nullable `description` (2,000 characters),
and `isActive`. Unit fields: `code`, `name`, optional nullable `symbol` (20 characters),
`decimalPlaces` (integer 0–6, defaults to 0 on creation), and `isActive`.
PATCH can clear description/symbol using `null`. Deactivate/reactivate with
`{ "isActive": false }` / `{ "isActive": true }`.

Each mutation and its audit entry share a transaction. Audit actions are
`process.created|updated|deactivated|activated` and
`unit.created|updated|deactivated|activated`, with actor, entity, changed values,
IP, and user agent when supplied by request context. Duplicate codes return 409,
including concurrent PostgreSQL unique violations. Missing records return 404;
invalid input returns 422.

## Breaking Job Worker contract change

`process` and `capacityUnit` are replaced by nullable UUID fields `processId` and
`capacityUnitId` in requests and responses. The list filter is now
`processId=<uuid>`. Legacy text fields and the old `process` query parameter are
rejected. Responses consistently return IDs; clients obtain display information
from the master endpoints. No names/codes are duplicated in Job Worker rows.

`capacityPerDay` retains its positive integer contract. It and `capacityUnitId`
must both be set or both be null. PATCH checks the resulting pair against stored
values; clear both together. Master precision is metadata for future quantity
modules; this change does not introduce fractional Job Worker capacity or unit
conversion.

New assignments require existing active masters (422 otherwise). Reference checks
lock the master rows within the write transaction to serialize with deactivation.
Unchanged historical references remain readable and may remain attached during
unrelated edits after a master is deactivated. Foreign keys prevent deletion of
referenced masters.

## Migration and seed

`0004_reference_masters` was generated with Drizzle, then extended with a reviewed
data backfill. Its journal timestamp `1790600544455` exceeds `0003_job_workers`'s
`1790600100000`. Run migrations through Drizzle so schema and data changes execute
transactionally. Schedule a maintenance window: the migration exclusively locks
`job_workers` during the backfill.

The migration reads distinct non-null legacy values, creates masters using
uppercase trimmed codes, backfills UUIDs, verifies every mapping and capacity
pair, and only then drops the text columns. Custom legacy codes (including spaces
accepted by the old process contract) survive; case/outer-whitespace variants
resolve to the same master. Blank legacy values abort the migration for explicit
repair rather than silently discarding data. Migrated names initially equal codes;
KG/MTR/YDS use three decimal places, other migrated units use zero. Migration-created
records have null actor fields because they were not created by an application user.

`pnpm --filter @garment-erp/api db:seed` idempotently adds baseline processes
CUTTING, STITCHING, EMBROIDERY, PRINTING, WASHING, FINISHING and units PCS, KG,
MTR, YDS, BOX, SET, ROLL. Existing records, names, precision, and active status
are preserved. Owner receives all permissions; other role defaults are unchanged.

Verification includes a PostgreSQL migration test in an isolated schema that is
rolled back, populated legacy fixtures, invalid-data rollback, FK/check/unique
constraints, CRUD/RBAC integration, concurrent duplicates, audit events, and
inactive/historical reference handling. As with existing suites, database tests
skip when PostgreSQL is unavailable.
