# Droovee — Security Audit Report

**Target:** https://droovee.vercel.app/ (production) and the `droovee-api` + `droovee-web` repositories in this workspace.
**Authorization:** Testing authorized by the Droovee owner (2026-10-17). Third-party infrastructure outside Droovee's control was not tested.
**Auditor role:** Application security engineering review (OWASP ASVS v4 / WSTG aligned), performed as a senior security engineer.
**Report date:** 2026-10-17. **Report version:** 1.0.

> **Honesty note:** Findings are labelled *source-confirmed* (verified in code with exact references), *live-confirmed* (verified at runtime against production with recorded evidence), or *suspected* (plausible from code, runtime proof not possible in this engagement). No vulnerability here is claimed from speculation alone. Absence of findings in an area is not proof of safety — see "Scope and coverage" at the end.

---

## 1. Executive summary

Droovee is a chauffeur-booking platform: a Next.js 15 frontend on Vercel proxies `/api/v1/*` to an Express 5 + Mongoose 9 API on Render (behind Cloudflare), backed by MongoDB. Authentication uses short-lived HS256 JWTs with rotating opaque refresh tokens in httpOnly cookies; authorization uses granular RBAC. The codebase shows a security-conscious design (hashed secrets, per-request DB revalidation, generic error responses, Zod validation on all write routes, layered rate limiting, audit logging, optimistic locking, MongoDB transactions for driver assignment).

However, the audit identified **two High-severity privacy/abuse issues in public unauthenticated endpoints**, several Medium hardening gaps, and — separately — a **severe performance problem** on the API path (p95 of 2–17 s at 1–5 virtual users) that materially affects availability and user experience.

### Findings by severity

| ID | Severity | Title | Status |
|---|---|---|---|
| DR-SEC-001 | **High** | Public booking tracking discloses PII and share links for any phone number; booking number alone returns live shareToken | Source-confirmed |
| DR-SEC-002 | **High** | Driver photo upload preserves attacker-controlled file extension and is served unauthenticated → stored content injection; also leaks driver-token prefix | Source-confirmed (runtime PoC not executed) |
| DR-SEC-003 | Medium | shareToken stored plaintext + indexed (unlike every other secret) and exposed via tracking API | Source-confirmed |
| DR-SEC-004 | Medium | OTP login endpoint lacks per-account rate limiting; `/driver/*` and `/ratings` rely only on the global 1000/15min backstop | Source-confirmed |
| DR-SEC-005 | Medium | Admin console has no server-side route gate in the frontend (client-side-only protection); admin UI bundle shipped to unauthenticated visitors | Source-confirmed |
| DR-SEC-006 | Medium | Trip START/END codes (single factor for trip state change) delivered in plaintext email | Source-confirmed |
| DR-SEC-007 | Medium | Booking creation (esp. guest) is non-transactional; coupon/booking consistency relies on compensating deletes | Source-confirmed |
| DR-SEC-008 | Low | `GET /admin/business` exposes insurance policy number to any role with `bookings:read` (incl. support) | Source-confirmed |
| DR-SEC-009 | Low | Client-supplied `X-Request-Id` reflected verbatim into responses/logs | Live-confirmed |
| DR-SEC-010 | Low | OTP verification failures are not audited; audit writes on customer routes are fire-and-forget | Source-confirmed |
| DR-SEC-011 | Informational | CSP lacks `script-src`; no Permissions-Policy; API responses lack HSTS of their own (edge adds it) | Live-confirmed |
| DR-SEC-012 | Informational | Dev seed script hardcodes staff credentials; backup script dumps password hashes to plaintext JSON | Source-confirmed |
| DR-SEC-013 | Informational | `trust proxy` set to 1 hop while chain is client → Vercel → Cloudflare → Render; rate-limit key correctness depends on this chain | Source-confirmed, behavior live-tested |
| DR-SEC-014 | Informational (positive) | Vercel Security Checkpoint blocks sustained automated HTML traffic from a single IP (measured threshold ~0.6–1 rps) | Live-confirmed |
| DR-SEC-015 | Medium | Vulnerable `postcss` (1 high + 1 moderate advisory chain) via `next` — build-time XSS/file-read vectors | Scan executed (npm audit), source-confirmed |
| DR-SEC-016 | Low | `npm test` broken on Node 22 (`node --test dist/test` → MODULE_NOT_FOUND) and suite non-hermetic: ambient `.env` (`OTP_ENABLED=true`) fails 10 of 39 security-critical integration tests | Executed with recorded evidence |

### Positive controls verified

- No secrets in git (`.env` gitignored and untracked); secrets required at boot with no fallbacks (`config.ts:36-49,94-98`).
- Refresh-token rotation with reuse-detection family revocation and audit trail (`tokens.ts:65-117`); `tokenVersion` invalidation on disable/role change/password reset.
- bcrypt cost 12, dummy-hash timing equalization on login (`auth.ts:89-91`), password policy + blocklist (`password.ts`).
- Zod validation on every POST/PATCH/PUT (unknown keys stripped); 100 kB JSON body cap; MongoDB queries use Mongoose parameterized APIs — no string-concatenated queries found.
- Ownership checks on customer booking routes return 404 (not 403) — enumeration-safe (`bookings.ts:319-327`).
- Admin routes double-gated: authentication + staff-kind check + per-route `requirePermission` against the DB-loaded role; no missing role checks found in the admin surface.
- Generic 500 responses with no stack/internal leakage (`errors.ts:37-39`); phones masked in list views (`ids.ts:33-38`).
- Rate-limit headers confirmed live and **not bypassable via `X-Forwarded-For`/`X-Real-IP` spoofing** (bucket decremented continuously across spoofed headers, 2026-10-17).
- Auth gates confirmed live: `GET /api/v1/bookings/my` → 401, `GET /api/v1/admin/dashboard` → 401, fake driver/share tokens → 404, HTTP→HTTPS enforced (308).

---

## 2. Confirmed findings — detail

### DR-SEC-001 (High) — Public tracking exposes customer PII and live share links

**Affected:** `droovee-api/src/routes/bookings.ts:277-310` (`GET /api/v1/bookings/track`), `customerView()` at `bookings.ts:590`.

**Issue:**
1. `?phone=<number>` alone (no booking number, no auth) returns up to **20 bookings** for that number, including pickup/destination **addresses**, scheduled times, status, fare, and — for assigned bookings — **driver name and phone** (`bookings.ts:290-299`).
2. `?bookingNumber=X` alone returns the same view **including the `shareToken`** (`bookings.ts:283`, field at `:590`), which grants unauthenticated live status tracking via `GET /api/v1/driver/share/:token`.

**Reproduction (read-only, synthetic):** `curl "https://droovee.vercel.app/api/v1/bookings/track?bookingNumber=DRV-TEST0000"` → 404 (correct for non-existent). The code path for a real booking number or any real phone number was reviewed in source; no real customer data was accessed during this audit.

**Impact:** Anyone who knows or guesses a customer's phone number can enumerate their bookings, home/work addresses, trip schedules, and driver contacts — a direct privacy and physical-safety issue (e.g., tracking when someone is travelling, where they live). Booking numbers (~40 bits entropy, `ids.ts:6-11`) are the only secret in path 2, and path 1 removes even that. The code comment (`bookings.ts:288-289`) treats phone numbers as "personal but not secret"; the aggregate disclosure (address + schedule + driver phone + share link) exceeds what that assumption should allow.

**Preconditions:** None (unauthenticated). Rate limit: estimate limiter 120 req/15 min/IP.

**Recommended fix (smallest safe):**
- Phone-only lookups: return only booking numbers + status + date (no addresses, no driver contact), **or** require an OTP step (already built) before revealing the full view.
- Booking-number-only lookups: exclude `shareToken` from the response; the share link should only be visible to the authenticated owner (it is already in the owner's `GET /bookings/:id` view).
- Consider hashing shareToken at rest (see DR-SEC-003).

**Regression test:** Two bookings created for customer A and B (test env). `GET /track?phone=<B's phone>` must not return addresses/driver phones/shareToken; `GET /track?bookingNumber=<A's>` must not contain `shareToken`.

---

### DR-SEC-002 (High) — Upload extension control + unauthenticated static serving + driver-token prefix leak

**Affected:** `droovee-api/src/routes/driver.ts:16-31,147-167`, `droovee-api/src/app.ts:79`.

**Issue:**
1. Multer keeps the **client-supplied extension** from `originalname` (`driver.ts:22-23`). The only type check is the client-asserted multipart `mimetype` header (`driver.ts:27-30`), which an attacker fully controls.
2. Files are served from **`/uploads` with no authentication** (`app.ts:79`) via `express.static`, which sets `Content-Type` from the extension. An uploaded `.html`/`.svg` file will therefore be served as `text/html`/`image/svg+xml` and **execute script in the site's origin** (API origin; for the web origin if uploads are ever served from the same domain).
3. The stored filename embeds `token.slice(0, 8)` (`driver.ts:23`) — the **first 8 characters of the raw driver link token are published in every photo URL** returned to staff UI and stored in the booking document, cutting that secret's entropy by 32 bits (remaining ≈88 bits — still large, but needless exposure of a bearer secret).

**Status:** Source-confirmed. The write-path PoC (uploading a `.html` file with an image mimetype) was **prepared but not executed** — it is a state-changing operation on production and was out of scope for this engagement. The serving behavior of `express.static` with an `.html` file is well-defined; treat as confirmed pending one staging test.

**Impact:** A malicious or compromised driver link holder can upload a stored HTML/SVG payload that executes in Droovee's origin when any staff member or user opens the photo URL (stored XSS → session/cookie theft on the API origin, phishing, defacement). The token-prefix leak also weakens driver-link secrecy and leaks into logs, screenshots, and support chats.

**Recommended fix:**
- Ignore client extension entirely: generate filenames as `<randomUUID>.jpg` and validate magic bytes (e.g., `file-type` package) server-side; re-encode images where feasible.
- Serve `/uploads` with `Content-Disposition: attachment` or from a separate domain/CDN with a fixed `Content-Type` and `X-Content-Type-Options: nosniff`; never rely on extension-driven content types for user uploads.
- Replace `token.slice(0,8)` with a random prefix or a non-secret booking reference.

**Regression test:** Upload a file named `x.html` with mimetype `image/jpeg` → server must store it with a server-generated name and a safe type; fetching it must return a non-executable content type. Filenames in responses must not contain any substring of the driver token.

---

### DR-SEC-003 (Medium) — shareToken stored in plaintext and indexed

**Affected:** `droovee-api/src/models/index.ts:184`, `droovee-api/src/services/assignment.ts:40,50`, exposed at `bookings.ts:590`.

**Issue:** Unlike OTPs, refresh tokens, driver tokens, and trip codes (all HMAC-hashed with the server pepper), `shareToken` is stored raw, unique-indexed, and returned by the tracking API. A database dump, backup (`scripts/backup-local.ts` dumps collections as JSON), log, or any read of the booking document yields working share links.

**Recommended fix:** Store `hmac("share|" + token)` and look up by hash (same pattern as `driverTokenHash`, `driver.ts:34`); keep returning the raw token only in responses to the booking owner at issue time.

**Regression test:** After assignment, the raw share token must not be present in any Booking document field; lookup by hash must still work.

---

### DR-SEC-004 (Medium) — Rate-limit gaps on OTP login and driver surface

**Affected:** `droovee-api/src/routes/auth.ts:100` (login-otp has `authLimiter` only — 30/15 min **per IP**, no per-account limiter unlike password login's `loginLimiter` at `auth.ts:86`), `driver.ts` (all routes), `ratings.ts:19`.

**Issue:** Password login is throttled 10/15 min per identifier; OTP login is not — with OTP enabled, an attacker rotating IPs could grind 6-digit codes limited only by the per-OTP 5-attempt cap and 60 s resend cooldown (`otp.ts:37-40,68-71`), i.e., ~5 tries per issued code per phone; combined with unlimited code requests from distributed IPs this is weak (6-digit space, but per-code attempts + cooldown make mass grinding expensive — still worth a per-account limiter). The `/driver/*` surface (bearer = link token, plus 4-digit trip codes) has no dedicated limiter: token brute force is constrained by entropy (96+ bits) but trip-code grinding against a stolen link is limited to the global 1000/15 min/IP backstop.

**Recommended fix:** Apply `loginLimiter()`-style per-identifier throttling to login-otp; add a per-token limiter (e.g., 60/15 min) on `/driver/j/:token/*`; add per-account lockout counters on repeated trip-code failures.

**Regression test:** 11 OTP login attempts for one phone from different IPs → 429 after the configured cap.

---

### DR-SEC-005 (Medium) — Admin console protected client-side only

**Affected:** `droovee-web/src/app/(console)/layout.tsx:4-6` (passthrough), `droovee-web/src/components/AdminShell.tsx:40-49` (localStorage-based redirect), no `middleware.ts` in the web app.

**Issue:** Any unauthenticated visitor can load admin page shells; the client decides whether to redirect based on **tamperable** `localStorage` (`droovee.ui` holds role/permissions). The API is the real enforcer (verified live: 401s), so there is no data exposure — but the admin UI structure/routes ship to the public, and a single mistake in a future page (e.g., rendering before the check, or trusting the localStorage role for display of sensitive hints) would expose it. Defense-in-depth is absent.

**Recommended fix:** Add `middleware.ts` that checks the session (e.g., calls `/auth/me` server-side or validates a session marker) before rendering `/admin/*`; keep the API checks as-is.

**Regression test:** Unauthenticated request to `/admin` returns a redirect to `/admin/login` from the edge/SSR layer, and the admin JS chunks are not fetched.

---

### DR-SEC-006 (Medium) — Trip START/END codes emailed in plaintext

**Affected:** `droovee-api/src/services/notify.ts:61-63`, codes surfaced once to staff at `admin.ts:438`.

**Issue:** The 4-digit START/END codes are the only second factor gating trip state transitions (`driver.ts:115-144`), and they travel in plaintext email alongside the booking number. Anyone with mailbox access (or a intercepted/forwarded mail) can start/end trips. The driver link alone already allows confirm/on-the-way/arrived; the codes only gate start/end — but email is the weakest channel in the chain.

**Recommended fix:** Show codes only in the authenticated customer app/track view (owner-authenticated), or deliver via a signed link with short TTL; at minimum avoid putting both codes in the same email and log code views to the audit trail.

**Regression test:** The `driver_assigned` notification record/email body must not contain raw codes after the fix.

---

### DR-SEC-007 (Medium) — Non-transactional booking creation with coupon handling

**Affected:** `droovee-api/src/routes/bookings.ts:212-232` (authenticated), `:523-537` (guest).

**Issue:** Booking insert, coupon `usedCount` increment, and redemption records are separate writes reconciled by compensating deletes. Under concurrency or crash-between-writes, states include: booking exists without redemption record (per-customer cap bypass), coupon consumed with booking deleted (user-visible failure but coupon burned), or — in guest flow with a crash — inconsistent coupon accounting. Driver assignment *does* use transactions (`assignment.ts:66-197`); booking creation does not.

**Recommended fix:** Wrap booking-create + coupon-consume + redemption in a MongoDB transaction (replica set already required and used elsewhere).

**Regression test:** Existing concurrent-assignment race test pattern applied to concurrent coupon bookings: exactly N bookings and N redemptions for N attempts with a perCustomerLimit ≥ N.

---

### DR-SEC-008 (Low) — Insurance policy number exposed to support role

**Affected:** `droovee-api/src/routes/admin.ts:1095-1098` (`GET /admin/business` guarded by `bookings:read`, which support has) vs. `PUT` requiring `pricing:write`.

**Recommended fix:** Gate the full document (policy number, validity) behind `pricing:write`; return the public subset (already exposed at `GET /api/v1/business`, `app.ts:61-72`) to `bookings:read`.

---

### DR-SEC-009 (Low) — Client-controlled X-Request-Id reflected

**Affected:** `droovee-api/src/app.ts:22-25`; **live-confirmed** 2026-10-17 (`X-Request-Id: security-audit-probe-001` echoed verbatim).

**Impact:** Log injection/forging if the ID reaches structured logs or SIEM; harmless otherwise.

**Recommended fix:** Accept only `^[A-Za-z0-9-]{8,64}$`, else generate a UUID.

---

### DR-SEC-010 (Low) — Audit coverage gaps

**Affected:** `otp.ts:67-76` (failed OTP verifications not audited); customer-route audits are fire-and-forget (`bookings.ts:234-241,348-355`), so a DB hiccup silently drops audit rows.

**Recommended fix:** Audit OTP failures (rate-abuse signal); await audit writes or queue them.

---

### DR-SEC-011 (Informational) — Header hardening opportunities

Live headers (2026-10-17): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, HSTS (no `preload`), CSP **without `script-src`** (`next.config.mjs:23-28`). API responses carry `Cache-Control: no-store` (good — no authenticated caching risk). Homepage HTML carries `Access-Control-Allow-Origin: *` (Vercel static delivery); API responses carry **no CORS headers** (cross-origin browser API access denied — correct for cookie auth).

**Recommended fix:** Add `script-src 'self' 'unsafe-inline'` (Next.js inline bootstrap) as a next CSP step; add `Permissions-Policy`; add `preload` to HSTS once verified.

---

### DR-SEC-012 (Informational) — Dev artifacts

`scripts/seed-local.ts:33-39` hardcodes `Admin#2026pass` for four staff emails (dev-only flag, but a known-credential risk if ever run against a shared DB); `scripts/backup-local.ts:33-36` dumps password hashes and audit data to plaintext JSON. Runtime logs (`coupon-debug.log`, `integration-run*.log`, `test-run*.log`) and `.env` exist locally but are **gitignored and untracked** (verified via `git ls-files`).

**Recommended fix:** Add a strong guard to seed (`if production throw`), encrypt backups or exclude credential collections.

---

### DR-SEC-013 (Informational) — Proxy-hop/trust configuration

`app.set("trust proxy", 1)` (`app.ts:18`) while the production chain observed is client → Vercel → Cloudflare → Render. Client-side `X-Forwarded-For` spoofing was **live-tested and does not shift the rate-limit bucket** (remaining decremented 998→995 across spoofed values), so the effective key is proxy-derived. Two residual risks: (a) if all user traffic ever resolves to one shared proxy IP, all users would share one 1000/15min bucket (could not be determined from a single test IP — **untested**); (b) any change in the proxy chain silently breaks IP keying. `rateLimit.ts:10-13` documents this.

---

### DR-SEC-014 (Informational, positive) — Edge bot protection observed

The site's edge returns **403 "Vercel Security Checkpoint"** pages (attributed live: `Server: Vercel`, no `Cf-Ray`, Astro-rendered checkpoint body) to sustained automated HTML requests from one IP (44–100% of requests during k6 runs; low-rate curl unaffected). Threshold measured at roughly >0.6–1 req/s sustained from a single IP. This limits anonymous scraping/hammering and also constrains single-IP load testing (see PERFORMANCE_REPORT.md). Note: a Cloudflare edge also sits in the path (`Cf-Ray` present on normal responses) — API JSON routes were not challenged during this engagement.

---

### DR-SEC-015 (Medium) — Vulnerable postcss chain in the web app

**Evidence:** `npm audit --omit=dev` in `droovee-web` (2026-10-17): `postcss <= 8.5.22` (HIGH — unescaped `</style>` XSS in CSS stringify output, plus three arbitrary-file-read advisories via attacker-controlled `sourceMappingURL`: GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849) pulled in by `next` (`9.3.4-canary.0 – 16.3.0-preview.10`); totals: 1 high + 1 moderate. Fix requires `next@16.4.2` (breaking major upgrade). `droovee-api` production dependencies: 0 vulnerabilities.

**Realistic impact for Droovee:** all four advisories are **build-time** vectors (CSS stringification and source-map loading run during `next build`, not per request); the CSS is developer-authored and production browser source maps are disabled. Residual risk: a malicious/compromised CSS dependency could exfiltrate build-environment files, and attacker-influenced CSS input could inject `</style>` markup into generated stylesheets. Not directly exploitable by an anonymous web visitor today — Medium, not High.

**Recommended fix:** schedule the `next` major upgrade (validate on staging; review breaking changes), or pin `postcss >= 8.5.23` via `overrides` if compatible; add `npm audit --omit=dev` to CI.

---

### DR-SEC-016 (Low) — Test suite broken and non-hermetic

**Evidence (executed 2026-10-17):** `npm test` (`node --test dist/test`) fails on Node v22.20.0 with `MODULE_NOT_FOUND` for `dist/test` (directory-as-test-root not resolved; `node --test dist/test/*.test.js` works). With the glob form: **10 of 39 tests fail** — all in `integration.test.ts` — because the suite reads the ambient local `.env` (`OTP_ENABLED=true`, `OTP_DEBUG=true`): registration then demands OTP (`400 "Enter the 6-digit code."`) and `/auth/otp/request` returns 200 where 404 is expected. Re-run with `OTP_ENABLED=false` pinned: **39/39 pass** (129 s).

**Why it matters (security):** the failing tests are precisely the security regressions (cross-customer IDOR 404s, role enforcement, assignment race, stale-version rejection, refresh-reuse/audit checks). A broken `npm test` means CI/developers see red constantly and lose the signal those tests provide.

**Recommended fix:** change the test script to `node --test \"dist/test/*.test.js\"` (or `node --test dist/test/` after verifying the Node version behavior) and pin test env inside the suite (`process.env.OTP_ENABLED = "false"` in a setup hook before config import), so results are independent of the developer's `.env`.

---

## 3. Areas reviewed with no findings

- **Injection:** No string-concatenated SQL/NoSQL; all queries via Mongoose APIs; no `eval`/`innerHTML`/`dangerouslySetInnerHTML` in web source.
- **CSRF:** Refresh/logout ride on httpOnly `SameSite=Lax` cookies with body-accepted tokens for non-browsers; state-changing endpoints require Bearer access tokens (not cookie-only) — CSRF risk is minimal as designed.
- **CORS:** No wildcard CORS on authenticated API responses (verified live).
- **Mass assignment:** All write bodies pass through Zod (unknown keys stripped) before any `req.body` spread.
- **Error leakage:** Generic 500s; `AppError` details are field-level validation hints only.
- **Secrets management:** Required env secrets with no fallbacks; `.env` untracked; only public values in `NEXT_PUBLIC_*`.
- **Payment integrity:** No payment gateway integrated; payments are staff-recorded cash entries — no client-trusted amounts found.

## 4. Not tested / out of scope (limits of this audit)

- **Not executed (state-changing or credentialed):** booking creation/cancellation flows at runtime, OTP request/verify at runtime, login brute-force, upload PoC, authenticated admin/customer sessions, coupon abuse, staff-management flows. Source-level review only for these.
- **Not tested:** SMS/WhatsApp providers (none wired), payment gateways (none exist), Render/MongoDB/Vercel dashboards and infrastructure hardening, DDoS resilience, WAF rule completeness, physical security, staff accounts' real-world password strength, email account security.
- **Rate-limit key cardinality** (shared vs per-IP bucket) could not be determined from a single source IP.
- **Dependency scanning (executed 2026-10-17):** `npm audit --omit=dev` — `droovee-api` production dependencies: **0 vulnerabilities**. `droovee-web`: **2** (1 high, 1 moderate) → recorded as DR-SEC-015 below.

## 5. Priority remediation order

1. DR-SEC-001 (public PII + share-token disclosure) — highest real-world privacy impact, trivially exploitable today.
2. DR-SEC-002 (upload type confusion) — one staging test to confirm, then fix extension/type handling and `/uploads` serving.
3. DR-SEC-003 + DR-SEC-006 (shareToken hashing; trip codes over email).
4. DR-SEC-004 (per-account OTP limiter; driver-route limiter).
5. DR-SEC-005 (frontend middleware gate) and DR-SEC-007 (transactions).
6. Low/informational items as convenient.

See `FIXES.md` for the actionable checklist and `SECURITY_TESTS.md` for regression procedures.
