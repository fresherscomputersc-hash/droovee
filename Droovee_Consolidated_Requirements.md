# Droovee — Consolidated Requirements Baseline (v1.1 draft)

**Sources:** `Driver_Booking_PRD_SRS.pdf` (v1.0, 10 Oct 2026) + `Droovee_TBD_Questions_and_Answers.md` (user-confirmed answers).
**Where the two sources conflict, the confirmed answers win** and the conflict is listed in §9.

---

## 1. Product summary

Droovee is a 24×7 company-managed driver-booking service in **Bhubaneswar, Odisha (IN)**. The company employs its own full-time drivers who drive the **customer's own car**. Customers book on the web or the Android app. Admin reviews requests, checks driver availability, assigns a driver manually, and contacts the driver by phone or WhatsApp. There is no driver app and no driver marketplace or auto-dispatch in the first release.

**First release surfaces:** customer website (responsive), Android customer app, admin web dashboard.
**Excluded:** iOS app, driver app, referral/loyalty, live GPS tracking, route optimisation, automated payroll.

**Shared backend principle:** one API and one source of truth for booking state, availability, fares and payments. Clients never send trusted values for customerId, role, final fare or payment success.

## 2. Services (launch)

| # | Service | Poster price (default) | Required extra inputs |
|---|---|---|---|
| 1 | Hourly driver | ₹149 for 1 hour | Duration (hours) |
| 2 | Half-day driver | ₹379 for 4 hours | Start time |
| 3 | Full-day driver | ₹849 for 8 hours | Start time |
| 4 | Monthly office pickup/drop | ₹5,999 / month | Recurring schedule: locations, working days, times |
| 5 | Outstation driver | One way ₹199/hr; round trip ₹169/hr; night halt ₹399/night | Destination, one-way/round-trip, trip dates, night-halt need |
| 6 | Airport / railway / bus-stop pickup/drop | ₹159/hour | Terminal/stop, drop location, time |

**Add-ons / modifiers (from poster):**
- Additional hours: ₹89/hour (for hourly/half-day/full-day beyond the package)
- Late-night service 10 PM–6 AM: additional ₹99
- Launch offer: first hour at **₹99 via coupon code**

**Open:** how these charges combine (see §10, item 1). Final fare is admin-adjustable with a recorded reason. The estimate shown to the customer before confirmation must be labelled as an estimate.

## 3. Booking

- **Timing:** immediate **or** scheduled for a future date/time.
- **Required fields for every booking:**
  1. Full name
  2. Mobile number, **OTP-verified**
  3. Pickup address (map pin and/or manual entry; store coordinates when available)
  4. Destination address
  5. Booking date and time
  6. Expected duration / hours
  7. Service type and package
  8. Car model and transmission type (manual / automatic)
  9. Additional instructions
- The form adapts by service type (monthly → recurring schedule; outstation → trip details).
- Booking lead time, service hours and holidays: **24×7, no lead-time restriction recorded** (confirm minimum lead time for immediate bookings; see §10).
- Out-of-area requests are accepted into a **review queue**; admin approves or declines.

## 4. Booking statuses (confirmed set of nine)

`requested` → `confirmed` → `driver_assigned` → `driver_on_the_way` → `in_progress` → `completed`

Side exits: `cancelled`, `rejected`, `customer_no_show`.

- Only allowed transitions are accepted by the backend.
- Every change stores timestamp and actor (admin ID where applicable).
- **Open:** whether customers can confirm completion (see §10, item 7). Baseline: admin updates status.

Note: the PRD's statuses (`pending`, `arrived`, `no_show / failed`, etc.) are **superseded** by this list. Keep `arrived` only if the client wants it; it is not in the confirmed list.

## 5. Driver assignment and availability

- Admin manually picks a driver, assigns, then records call/WhatsApp contact and the driver's confirmation (`not_contacted`, `contacted`, `confirmed`, `declined`, `unreachable`).
- **Conflict handling:** the system **warns** on overlap. An authorised admin may **override with a recorded reason**. This is a deliberate change from the PRD's hard block (PR-06 / FR-DRV-04); the PRD's "reject on conflict" rule is replaced by warn-and-override.
- Conflict check considers existing bookings, expected duration, availability blocks (leave, unavailable) and **buffer time between trips**.
- Eligibility is derived from bookings, shifts and availability blocks, not from a mutable flag.
- Assignment writes use concurrency control; a stale availability check returns 409.

## 6. Payments

- **Methods:** UPI, debit/credit card (via gateway), **cash paid to the driver**.
- **Online (UPI/card):** order created server-side; success only after server verification or a signed webhook; webhook events idempotent by event ID.
- **Cash:** recorded by authorised staff with amount, method, receiver, timestamp, reference/notes.
- **Ledger:** `payments` collection is the source of truth. Booking `paymentStatus` is a summary.
- Payment status is separate from booking status.
- **Refunds:** admin reviews and decides; refund status tracked separately from booking status; gateway reference retained.
- Do not store raw card details.
- **Open:** when payment is collected (PRD §8 said configurable; still undecided). Gateway: Razorpay is the PRD's suggestion, not yet confirmed.

## 7. Customer accounts and auth

- **Login:** both **OTP** and **password**, linked to the **same account**, booking history preserved.
- Passwords: strong salted hash. OTP: expiry + attempt limits + rate limiting.
- Short-lived access tokens; protected refresh tokens (mobile); HttpOnly cookies for web where used, with CSRF protection.
- Sessions revoked on logout or account disablement. Disabled staff lose access immediately.

## 8. Admin dashboard

**Modules (all nine confirmed):**
1. Booking management
2. Driver management
3. Driver availability
4. Customer management
5. Payments and refunds
6. Pricing and coupons
7. Reports and analytics
8. Admin staff accounts and permissions
9. Activity and audit logs

**Support:** ticket system in the dashboard. Ticket fields: category, description, related booking ID (optional), status, timestamps, resolution notes. Customer channels: phone, WhatsApp, and tickets.

**Owner overview (7 areas):** today's bookings and completed trips; pending requests and bookings needing assignment; available / assigned / unavailable drivers; revenue by day/week/month; pending payments, cash collections, refunds; out-of-area requests, conflicts, open support issues; booking trends. Revenue must separate collected from pending, and track refunds separately.

**Roles (from answers):** owner/super admin, operations, support, finance.
Sensitive actions limited to authorised roles: fare overrides, refunds, permission changes, conflict overrides.

## 9. Conflicts between PRD and confirmed answers (resolved)

| Topic | PRD said | Answers say | Used in this baseline |
|---|---|---|---|
| Overlap | Hard block (409) | Warn + override with reason | Warn + override |
| Booking statuses | 9 different values incl. `pending`, `arrived` | 9 specific values | Confirmed set in §4 |
| Customer registration | Register/login | OTP or password, same account | Both methods |
| Roles | Customer, Dispatcher, Finance, Super admin, Owner | Owner/super admin, operations, support, finance | Confirmed set |
| Service area | Deferred, not in MVP | Admin-configurable zones, in MVP | In MVP |
| Support tickets | Not in PRD | In scope | In scope |
| Payment methods | Gateway + offline | UPI, card, cash to driver | Gateway (UPI/card) + cash record |
| Ratings / referral / loyalty | Ratings "Later"; referral "Later" | Excluded; coupons only | Coupons only |
| Driver payroll | Deferred | Skipped by user | Not specified; do not build payroll calc |

## 10. Still open (block production, not necessarily MVP build)

1. **Fare combination rules:** how hourly, package, extra hours, late-night, airport, outstation and night-halt charges combine.
2. **Service-zone boundaries** and the out-of-area approval workflow details.
3. **Payment gateway** selection and merchant onboarding.
4. **WhatsApp Business provider**, templates and notification triggers.
5. **Cancellation fees and refund rules** beyond admin discretion.
6. **Driver salary / payroll scope** (skipped by user).
7. **Customer completion confirmation / completion disputes.**
8. **Hosting, monitoring and operating budget.**
9. **Minimum lead time** for immediate and scheduled bookings.
10. **When payment is collected** (at booking, before trip, after trip).

## 11. Non-functional requirements (retained from PRD)

- API p95 < 500 ms for common calls, excluding gateway/maps latency.
- HTTPS everywhere; secrets outside source control; separate dev/staging/prod credentials.
- INR formatting; Asia/Kolkata display; UTC storage.
- Logs with request IDs; never log passwords, OTPs, tokens or payment secrets.
- Responsive UI; accessible labels; usable on common Android screen sizes.
- Automated tests: fare rules, status transitions, interval overlap, permissions, validation, concurrency, webhook idempotency.
- Backups enabled and restore tested before launch.

## 12. Suggested build order (from PRD §21, adjusted)

1. Backend foundation: auth (OTP + password), roles, customers, drivers, bookings, status machine, audit log, pricing/coupon engine.
2. Admin dashboard: booking queue, driver directory, availability, assignment with conflict warnings, contact log, status updates.
3. Customer website: booking form (adaptive), estimate, confirmation, status view, history.
4. Payments: UPI/card gateway, webhook, cash receipts, refunds, ledger.
5. Support tickets, reports, owner overview.
6. Android customer app on the same API.
7. QA, security review, backup restore test, launch.
