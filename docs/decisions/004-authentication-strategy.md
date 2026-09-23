# 004 — Authentication: Argon2id password hashing + server-side sessions

## Status

Accepted

## Context

The blueprint requires: no plaintext/reversible passwords, instant blocking
of deactivated users, working logout/revocation, and eventual support for
scanner/mobile clients. Two independent decisions were needed: how to hash
passwords, and how to keep a user "logged in" across requests.

## Decision

**Password hashing:** Argon2id via the `argon2` npm package (native
bindings). It is the current OWASP-recommended default, purpose-built for
password hashing (unlike general-purpose hashes), and memory-hard against
GPU cracking in a way bcrypt is not.

**Session strategy:** server-side sessions, not JWT. A random opaque token
is set as an `httpOnly` cookie; only its SHA-256 hash is stored in the
`sessions` table (`apps/api/src/lib/session.ts`). `requireAuthenticatedUser`
resolves the session on every request and checks `users.is_active` at that
moment — a deactivated user's session stops working immediately, and logout
is a single `DELETE` by token hash. `apps/web` (`:3000`) and `apps/api`
(`:4000`) are cross-origin but same-*site* (site = registrable domain, port
doesn't count), so `SameSite=Lax` cookies flow correctly between them in
dev without HTTPS; the same holds in production as long as both are
deployed under a shared parent domain.

## Consequences

- Instant revocation and instant deactivation enforcement, which a
  stateless JWT cannot give without reintroducing server-side state (a
  blocklist) anyway.
- One extra DB lookup per authenticated request (`sessions` join `users`,
  indexed on `sessions.user_id` and the unique `token_hash`) — acceptable at
  this scale, and cheaper than validating/refreshing JWTs correctly.
- If `apps/web` and `apps/api` are ever deployed on unrelated domains (not
  sharing a parent domain), the cookie needs `SameSite=None; Secure`, which
  requires HTTPS — `setSessionCookie` in `lib/session.ts` is the one place
  to change this.
- Future scanner/mobile clients are not blocked by this choice: a
  webview-based client can reuse the session cookie as-is; a native client
  that needs token auth gets a separate strategy added alongside sessions
  when that's actually being built, not designed for speculatively now.
