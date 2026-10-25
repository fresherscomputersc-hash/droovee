# Droovee — Remediation Checklist (FIXES)

**Mode:** Report-only engagement — **no application code was changed** (owner directive, 2026-10-17). Items below are the prioritized plan with the smallest safe fix per finding, proposed regression tests, and files that would change. Nothing here has been deployed.

Priorities: P0 = fix now (privacy/abuse), P1 = fix this cycle, P2 = next, P3 = hygiene.

---

## P0

### 1. Close public tracking PII/share-token disclosure — DR-SEC-001
- **Root cause:** `GET /api/v1/bookings/track` returns the full `customerView` (addresses, driver contact, `shareToken`) for (a) any phone number alone and (b) any booking number alone.
- **Smallest safe fix:**
  1. `droovee-api/src/routes/bookings.ts` phone-only branch (`:290-299`): return `{items: [{bookingNumber, status, scheduledStart, serviceType}]}` only.
  2. Booking-number branch (`:280-285`): drop `shareToken` from the response (strip in a track-specific view or delete the field from the object before `res.json`).
  3. Optionally: require phone + booking number together for the full view (already supported at `:301-309`).
- **Regression test:** `SECURITY_TESTS.md` § VAL-001.
- **Before/after:** before — unauthenticated address+shareToken disclosure (source-confirmed); after — expected 200-with-minimal-fields; test asserts absence of `pickup.address`, `driver.phone`, `shareToken`.

### 2. Fix upload type confusion + token-prefix leak — DR-SEC-002
- **Root cause:** client extension preserved (`driver.ts:22-23`), mimetype only client-asserted (`:27-30`), served statically unauthenticated (`app.ts:79`).
- **Smallest safe fix:**
  1. `droovee-api/src/routes/driver.ts` filename: `${randomUUID()}.jpg` (no `originalname`, no token prefix).
  2. Magic-byte validation (e.g., `file-type`) after upload; delete non-images.
  3. `droovee-api/src/app.ts` `/uploads`: serve with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, or move to a separate domain; alternatively add an Express route that streams bytes with a fixed `Content-Type`.
- **Regression test:** VAL-002 (upload `poc.html` with `type=image/jpeg` → rejected or stored inert).

## P1

### 3. Hash shareToken at rest — DR-SEC-003
- **Fix:** `models/index.ts:184` store `shareTokenHash` (unique index kept), compute in `services/assignment.ts:40,50` with `hmac("share|"+token)`; lookup in `driver.ts:171` by hash; return raw token only to the booking owner at creation/issue time (`bookings.ts:590` — keep for owner-authenticated views only).
- **Regression test:** VAL-003 (raw token absent from DB; share link still resolves).

### 4. Per-account OTP login limiter + driver-route limiter — DR-SEC-004
- **Fix:** apply `loginLimiter()`-style keying (identifier) to `POST /auth/customer/login-otp` (`auth.ts:100`); add `make(WINDOW, 60, token-keyed)` limiter across `driverRouter` (`driver.ts`); consider lockout counter on repeated trip-code failures.
- **Regression test:** VAL-004.

### 5. Trip codes out of email — DR-SEC-006
- **Fix:** `services/notify.ts:61-63` stop appending raw codes; surface codes in the authenticated booking detail page (owner-only) and/or authenticated track view; keep audit of code views.
- **Regression test:** VAL-006.

### 6. Transactional booking creation — DR-SEC-007
- **Fix:** wrap booking insert + coupon consume + redemption insert in `mongoose.startSession()`/transaction (`bookings.ts:212-232`, `:523-537`) — replica set already required and used in `assignment.ts`.
- **Regression test:** VAL-007 (concurrent coupon bookings).

### 7. Frontend server-side admin gate — DR-SEC-005
- **Fix:** add `droovee-web/src/middleware.ts` guarding `/admin/*` (redirect to `/admin/login` unless a valid session is confirmed server-side via `API_TARGET` `/auth/me`), keep client checks.
- **Regression test:** VAL-005.

### 8. Upgrade `next` (postcss advisories) — DR-SEC-015
- **Fix:** plan `next@16.4.2` upgrade (breaking) on staging, or `overrides: {"postcss": ">=8.5.23"}` if resolution allows; add `npm audit --omit=dev` CI gate.
- **Regression test:** `npm run build` + `npm run typecheck` green; CI audit gate.

## P2

### 9. Business endpoint role scope — DR-SEC-008 — gate `GET /admin/business` behind `pricing:write`, return public subset to `bookings:read` (VAL-008).
### 10. Request-id sanitization — DR-SEC-009 — `app.ts:22-25` regex-validate incoming `X-Request-Id`, else UUID (VAL-009).
### 11. Audit gaps — DR-SEC-010 — audit OTP verify failures; await/queue customer-route audit writes.
### 12. Fix the test pipeline — DR-SEC-016 — change `package.json` test script to `node --test \"dist/test/*.test.js\"` and pin `OTP_ENABLED=false`/`OTP_DEBUG=false` inside the suite setup so results don't depend on the developer's `.env` (verified: 39/39 pass when pinned; 10/39 fail with ambient dev flags).
### 13. Shared-store rate limiting — scale-out readiness: replace in-memory store (`rateLimit.ts:7-13`) with Redis-backed limiter before running >1 API instance; document/verify hop count for `trust proxy` (DR-SEC-013).

## P3

### 14. Header hardening — DR-SEC-011 — add `script-src` to CSP (Next bootstrap-compatible), `Permissions-Policy`, HSTS `preload` (after verification).
### 15. Dev-artifact guards — DR-SEC-012 — `if (config.env === "production") throw` in `scripts/seed-local.ts`; exclude credential collections from `scripts/backup-local.ts` or encrypt output.
### 16. Performance (not a security fix, tracked in PERFORMANCE_REPORT.md) — cache active settings in-process (TTL 30–60 s) to remove a MongoDB roundtrip per public API call (`services/settings.ts:10-21`); investigate Render cold-start/region latency; consider co-locating API and DB with the Vercel edge or caching public API responses at the edge.

---

## Verification status

| Item | Code changed? | Tests run? | Notes |
|---|---|---|---|
| All | **No** (report-only) | Baseline suite only: see below | Awaiting owner scheduling |

**Baseline test execution (2026-10-17):** `npm test` in `droovee-api` — executed, results recorded in PERFORMANCE_REPORT.md §6.
