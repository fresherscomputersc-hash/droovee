# Droovee API (v0.1 foundation)

Backend for the Droovee driver-booking platform (Bhubaneswar, 24×7).
Stack (from the PRD): Node.js 20+, Express 5, TypeScript, MongoDB + Mongoose, Zod.

## Run

```bash
npm install
cp .env.example .env        # fill in secrets
npm run build
npm start
npm test                    # unit + in-memory MongoDB integration tests
```

`npm test` downloads a MongoDB binary the first time (via `mongodb-memory-server`), so it needs internet once.
Transactions need a MongoDB replica set. Atlas is one; a local `mongod` must be started with `--replSet`.

## What is built

| Area | Status |
|---|---|
| Pricing engine (poster rates, extra hours, late-night, outstation, night halt, first-hour coupon) | Built, unit-tested |
| Booking status machine (9 confirmed statuses) | Built, unit-tested |
| Driver overlap check with buffer; warn + override with reason | Built, integration-tested |
| Assignment under concurrency (transaction + driver lock) | Built, race-tested |
| Customer auth: register/login with OTP-verified mobile, or password | Built (OTP SMS provider not yet wired) |
| Staff auth and RBAC (owner, operations, support, finance) | Built, tested |
| Disabled staff lose access on next request | Built, tested |
| Customer booking create / list / view (own only), cancel request | Built, tested |
| Admin: bookings queue, assign, reassign, status, fare adjust, contact log, offline cash receipt | Built, tested |
| Drivers, availability blocks, schedule view | Built (basic) |
| Coupons, settings versions, staff management, audit log (append-only in app code) | Built (basic) |
| Refresh-token rotation and logout | Built (not yet covered by tests) |
| Online payments (gateway order, verify, signed webhook, refunds) | **Not built** (next phase) |
| WhatsApp / SMS notifications | **Not built** |
| Support tickets, dashboards and reports beyond the summary | **Not built** |
| Customer completion confirmation | **Not built** (open decision) |

## Unconfirmed business rules

Values in `src/domain/settings.ts` marked `"unconfirmed"` are placeholders, not approved policy:
- fare combination rule (how package, extra hours, late-night and night-halt charges add up)
- driver buffer minutes (set to 0)
- minimum booking lead time (set to 0)
- cancellation fee and window
- when payment is collected
- whether customers can confirm completion

`GET /api/v1/admin/settings` lists them. **In production the server refuses to start while any of them is still unconfirmed.** Set the values and mark them confirmed through `PUT /api/v1/admin/settings` (saved as a new version) once the client approves.

## Key API endpoints (prefix `/api/v1`)

- `POST auth/otp/request`, `POST auth/customer/register`, `POST auth/customer/login`, `POST auth/customer/login-otp`
- `POST auth/staff/login`, `POST auth/refresh`, `POST auth/logout`, `GET auth/me`
- `GET pricing/estimate`, `GET services`
- `POST bookings`, `GET bookings/my`, `GET bookings/:id`, `POST bookings/:id/cancel`
- `GET admin/dashboard`, `GET admin/bookings`, `GET admin/bookings/:id`
- `PATCH admin/bookings/:id/assign`, `PATCH admin/bookings/:id/reassign`, `PATCH admin/bookings/:id/status`, `PATCH admin/bookings/:id/fare`
- `POST admin/bookings/:id/contact-log`, `POST admin/bookings/:id/offline-payment`
- `GET|POST admin/drivers`, `PATCH admin/drivers/:id`, `GET admin/drivers/:id/schedule`, `POST admin/availability-blocks`
- `GET|POST admin/coupons`, `GET|PUT admin/settings`, `POST|PATCH admin/staff`, `GET admin/audit-logs`

Errors use `{ code, message, fieldErrors?, details?, requestId }`. Assignment conflicts return `409` with `details.code = "DRIVER_CONFLICT_WARNING"`.

## Security notes

- Passwords: bcrypt (cost 12). OTPs and refresh tokens: stored as HMAC with `TOKEN_PEPPER`, never in plaintext.
- OTP: 5-minute expiry, attempt limit, resend cooldown.
- Auth routes are rate-limited (30 requests / 15 min / IP). The limiter is in memory, so use a shared store (e.g. Redis) when running more than one instance.
- Customers get `404` for bookings that aren't theirs, so IDs can't be enumerated.
- Customers never see internal fields (contact log, override reasons, fare notes).
- Production start checks for `JWT_ACCESS_SECRET`, `TOKEN_PEPPER` and `MONGODB_URI`.
