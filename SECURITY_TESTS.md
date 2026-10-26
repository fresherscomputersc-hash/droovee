# Droovee — Security Validation Procedures

Safe, repeatable procedures to validate the findings in `SECURITY_AUDIT.md` and to guard against regressions. **Nothing in this document should be run against production except the explicitly marked "public, read-only" checks.**

## 1. Test-account and environment requirements

| Requirement | Details |
|---|---|
| Environment | Staging/local preferred. Local: `droovee-api` with `mongodb-memory-server` (used by `npm test`) or a local replica set. |
| Accounts | Two synthetic customer accounts (A and B) with distinct phone numbers you control; one staff test account (support role) and one owner account. Never reuse real customer credentials. |
| Data | Synthetic bookings only (`DRV-T*`-style), future dates, fake addresses. |
| OTP | Production: `OTP_ENABLED=true` plus a `WAKIT_API_KEY` (Wakit sends and verifies the WhatsApp code). Local debug: `OTP_PROVIDER=local` with `OTP_DEBUG=true`; never in production. |
| Email | Leave SMTP unconfigured in tests → reset links surface in the local response (`auth.ts:185-187`, dev-only) instead of sending mail. |
| Cleanup | `test/*.test.ts` uses an in-memory DB (auto-wiped). For manual runs: delete created customers/bookings by their synthetic phone numbers/booking numbers. |

## 2. Public read-only checks (production-safe, executed 2026-10-17)

Run at low rate (≤1 request/s). Evidence recorded in `PERFORMANCE_REPORT.md`.

```powershell
# 1. Health + DB
curl.exe -sS https://droovee.vercel.app/api/v1/health
# expect: {"status":"ok","db":"up"}   (503 {"status":"degraded"} if DB down)

# 2. Auth gates return 401 without credentials
curl.exe -sS -o NUL -w "%{http_code}" https://droovee.vercel.app/api/v1/bookings/my      # 401
curl.exe -sS -o NUL -w "%{http_code}" https://droovee.vercel.app/api/v1/admin/dashboard  # 401

# 3. Fake driver/share tokens return 404 (no oracle)
curl.exe -sS -o NUL -w "%{http_code}" https://droovee.vercel.app/api/v1/driver/j/FAKE123456     # 404
curl.exe -sS -o NUL -w "%{http_code}" https://droovee.vercel.app/api/v1/driver/share/FAKE123456 # 404

# 4. Synthetic tracking miss
curl.exe -sS "https://droovee.vercel.app/api/v1/bookings/track?bookingNumber=DRV-TEST0000"  # 404

# 5. HTTPS enforcement
curl.exe -sS -o NUL -w "%{http_code}" http://droovee.vercel.app/   # 308 to https

# 6. Rate-limit header presence + XFF spoof resistance (compare remaining values)
curl.exe -sS -o NUL -D - https://droovee.vercel.app/api/v1/ratings/recent | findstr /i ratelimit
curl.exe -sS -o NUL -D - -H "X-Forwarded-For: 203.0.113.77" https://droovee.vercel.app/api/v1/ratings/recent | findstr /i ratelimit
# expect: remaining decreases monotonically across spoofed values (no new bucket)

# 7. Security headers on document + API
curl.exe -sS -D - -o NUL https://droovee.vercel.app/ | findstr /i "strict-transport x-frame content-security referrer"
```

**Do NOT run in production:** OTP requests, login attempts, booking writes, uploads, coupon probing, phone-number enumeration of `/track` with real numbers.

## 3. Findings validation (staging/local only)

### VAL-001 — Track endpoint PII disclosure (DR-SEC-001)
1. Create bookings for customer A and customer B (synthetic data).
2. `GET /api/v1/bookings/track?phone=<B's phone>` → **fail condition (vulnerable):** response items contain `pickup.address`/`destination.address`, `driver.phone`, or `shareToken`.
3. `GET /api/v1/bookings/track?bookingNumber=<A's bookingNumber>` → **fail condition (vulnerable):** response contains `shareToken`.
4. Expected after fix: phone-only returns booking numbers + status + dates only; booking-number-only excludes `shareToken`.

### VAL-002 — Upload type confusion (DR-SEC-002)
1. Obtain a valid driver link token (staging assignment).
2. `curl.exe -F "photos=@poc.html;type=image/jpeg" https://<staging>/api/v1/driver/j/<token>/photos`
3. Read the returned `photos[].url`; fetch it directly.
4. **Fail condition (vulnerable):** stored URL ends in `.html`, or fetching it returns `Content-Type: text/html` (executable content in origin), or filename contains the first 8 chars of the driver token.
5. Cleanup: delete the uploaded file from `uploads/car-photos/` and the booking document's `carPhotos` entry.

### VAL-003 — shareToken at rest (DR-SEC-003)
1. After assignment, query the raw Booking document: `db.bookings.findOne({bookingNumber:"<n>"}) {shareToken:1}`.
2. **Fail condition:** a raw usable token string is present (expected pre-fix; after fix only an HMAC hex digest).

### VAL-004 — OTP/account rate limits (DR-SEC-004)
1. Staging with OTP enabled: fire 11 `POST /api/v1/auth/customer/login-otp` attempts for one phone from one IP.
2. **Pass:** 429 after the configured per-identifier cap (currently only the 30/15m IP bucket applies — the gap being validated).
3. Driver surface: >60 requests/min to `/api/v1/driver/j/<valid-token>` → **pass:** 429 (currently absent — expect fail pre-fix).

### VAL-005 — Admin UI server gate (DR-SEC-005)
1. Unauthenticated `curl -D - https://droovee.vercel.app/admin` (staging).
2. **Pass after fix:** redirect to `/admin/login` from the server/edge; admin page chunks not delivered. Currently: 200 HTML shell (client-side guard only).

### VAL-006 — Trip codes in email (DR-SEC-006)
1. Trigger `driver_assigned` with SMTP unset locally; inspect the message body prepared by `notify.ts`.
2. **Fail condition:** raw START/END codes present in the email text.

### VAL-007 — Coupon concurrency (DR-SEC-007)
1. Extend `integration.test.ts`'s race-test pattern: N concurrent bookings with `perCustomerLimit = N/2`.
2. **Pass:** exactly N/2 redemptions and N/2 discounted bookings; no booking exists without its redemption record.

### VAL-008 — Business endpoint role scope (DR-SEC-008)
1. As `support` staff: `GET /api/v1/admin/business`.
2. **Pass after fix:** `insurancePolicyNumber` absent. Currently: present.

### VAL-009 — Request-id reflection (DR-SEC-009)
`curl -H "X-Request-Id: abc<script>" ... /api/v1/services` → **pass after fix:** header not echoed verbatim (UUID returned instead).

## 4. Regression checks to add to CI (recommended)

- `node --test dist/test` must stay green (covers IDOR 404s, role enforcement, refresh-reuse revocation, assignment races, weak-password policy — see `test/integration.test.ts`).
- Add VAL-001/002/005 as automated tests; they are the highest-value guards.
- Run `npm audit --omit=dev` in CI and gate on high/critical.

## 5. Status legend (per honesty requirements)

- Procedures in §2: **Executed with recorded evidence** (2026-10-17).
- Procedures in §3: **Test prepared but not executed** (state-changing / credentialed — out of scope for this engagement), except where noted source-confirmed in the audit.
