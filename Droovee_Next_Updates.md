# Droovee — Next Updates Plan

> - **Created:** 2026-10-24
> - **Last updated:** 2026-10-25
> - **Status:** Phase 2 and the approved top-priority updates were released on 2026-10-25. PR #4 squash-merged as `a9bccef`; main CI passed; Render and Vercel serve the new build. All remaining operations and verification items are deferred to a later window (owner decision 2026-10-25).
> - **Local codebase:** `E:\DROOVEE`
> - **Remote:** `origin/main` — Phase 1 commit `dc41717`; CI commit `9344713`; release `a9bccef`.
> - **Backup of the original WIP branch:** `wip/priority-updates-20261025` (`b3ed09d`)
> - **Local integration branch (earlier):** `release/next`
> - **Clean release branch:** `release/2026-10-25` (production files plus docs; excludes paused landing-preview assets)

---

## 0. Non-negotiable rules

- **Official contact number:** `+91 81149 94367`
- **Authoritative pricing:**
  - First hour: ₹149, extra hours: ₹129/hour
  - Half-day: ₹599 for 4 hours, extra hours: ₹129/hour
  - Full-day: ₹1,099 for 8 hours, extra hours: ₹129/hour
  - Monthly office: from ₹6,999/month, customizable
  - Outstation one-way: ₹199/hour
  - Outstation round-trip: ₹169/hour + ₹399 night halt
  - Airport pickup/drop: ₹199/hour
  - Late-night surcharge: ₹149
- **Banned wording:** do not reintroduce the term removed during Phase 1.
- **Testimonials:** keep the `/testimonials` page and the homepage section, but keep “Testimonials” out of the desktop nav and mobile drawer.
- **Hero rating:** keep the `4.9/5 from 1,000+ car owners` line unchanged.
- **Monthly tab:** show only “from ₹6,999/month · customizable” as the price.
- **Packages:** must be recalculated from the rates above.
- **Old settings:** deactivate and keep as history.
- **Pushing:** do not push again until the owner confirms all changes are complete.

---

## 1. Top-priority updates — owner to define

> **These come first.** List the urgent fixes/changes here before starting the phase roadmap below.

| # | Priority update | Area | Why urgent | Status |
|---|-----------------|------|------------|--------|
| 1 | Keep the admin dashboard as simple as possible; remove the revenue section from the **dashboard only**. Do **not** remove Revenue from the side panel. | Admin web | Owner request — reduce dashboard clutter while keeping revenue reporting accessible from the side panel. | Done — revenue cards removed; side panel unchanged. |
| 2 | Remove **Business** from the admin side panel. The Business page/functionality is deferred to Phase 3. | Admin web | Owner request — simplify the admin navigation. | Done — nav entry removed; page and API intact. |
| 3 | Remove the **Company / Hiring incomplete** section from the **admin dashboard**. This is the panel currently listing 4 drivers with missing onboarding documents. Keep the driver records and onboarding functionality; remove only the dashboard panel. | Admin web | Owner request — reduce dashboard clutter. | Done. |
| 4 | Add a **proper new-booking alarm** for admin: audible alert + persistent on-screen notification when a new booking arrives. | Admin web / API | Owner request — staff must not miss new bookings. | Done locally — audio behaviour still needs a manual browser check. |
| 5 | Improve live-site performance. The owner reports the live website feels slow. | Web / API / hosting | Owner request — perceived speed affects bookings and admin work. | Implemented locally — deploy and measure after release. |
| 6 | Clean up Mongoose deprecation warnings: replace `{ new: false }` with `{ returnDocument: "before" }` and audit all `findOneAndUpdate`/`findByIdAndUpdate` calls. | API | Owner shared production logs — warning is noisy but non-breaking; clean it up before release. | Done. |

**Owner notes / acceptance criteria:**

- Admin dashboard: no revenue cards/sections on the dashboard itself. Revenue remains available via the side-panel Revenue entry.
- Admin side panel: no Business link. Do not delete the Business page or its API unless separately approved; only remove the navigation entry for now.
- Admin dashboard: owner confirmed this is the **Company / Hiring incomplete card**, not a side-panel item. Remove that dashboard panel; it currently shows:
  - Ramesh Behera (`DRV-001`) — missing idProof, licence, policeVerification, testDrive, references, codeOfConduct
  - Mahesh Nayak (`DRV-003`) — missing idProof, licence, policeVerification, testDrive, references, codeOfConduct
  - Suresh Sahu (`DRV-002`) — missing idProof, licence, policeVerification, testDrive, references, codeOfConduct
  - Ganesh Pradhan (`DRV-004`) — missing idProof, licence, policeVerification, testDrive, references, codeOfConduct
- Do not delete or alter the driver records themselves. Hiring/onboarding remains available in the Drivers area and Phase 3.

**New-booking alarm requirements (implemented behaviour):**

- Trigger only when a genuinely **new booking** is created — not on status updates, edits, or page reloads.
- Play an audible alarm and show a persistent banner/toast with the booking ID and service.
- Require an explicit **Acknowledge/Dismiss** action; do not auto-hide while unacknowledged.
- Include an admin mute/enable toggle.
- Handle browser autoplay rules: the alarm must be unlocked by the admin’s first interaction with the console.
- Desktop notifications are not included in this pass; the in-page alarm and banner are the required behaviour.
- Delivery uses a lightweight authenticated poll every 15 seconds (reliable through the current Vercel → Render proxy).

**Live performance findings (read-only sample, 2026-10-24):**

- Vercel web root: first request ~3.05s TTFB; warm requests ~0.30–0.65s.
- Vercel `/pricing`: ~0.31–0.80s TTFB.
- Render `/api/v1/health`: first request ~2.05s; warm requests ~0.76–1.26s.
- Render `/api/v1/services`: ~0.78–0.90s TTFB.
- Likely causes to check: Render cold starts / instance size, API-to-database latency, sequential API calls, client bundle size, missing caching for public data, and image/asset weight.
- Implemented locally:
  - Removed startup `syncIndexes()`; production starts with `autoIndex` off and an explicit `npm run db:indexes` step.
  - Added compression and public-response caching headers.
  - Added a server-only middleware JWT check so `/admin/*` does not call `/auth/me` on every page load.
  - Reduced the admin dashboard payload and trimmed the booking list payload.
- Remaining: deploy and measure the owner's actual slow pages against the new baseline.

**Mongoose deprecation warning (from production logs):**

- Warning: `the 'new' option for findOneAndUpdate() and findOneAndReplace() is deprecated. Use returnDocument: 'before' instead.`
- This is a **warning, not a runtime failure** — requests still work.
- Confirmed occurrences:
  - `droovee-api/src/routes/driver.ts:446` — `{ new: false }`
  - `droovee-api/src/lib/tokens.ts:107` — `{ new: false }`
- Fix: use `{ returnDocument: "before" }` (equivalent to `new: false`).
- Also audit remaining `findOneAndUpdate` / `findByIdAndUpdate` calls for any explicit `new` option.
- Acceptance: no Mongoose deprecation warnings during API startup or normal booking/driver flows.
- Status: fixed locally; the deprecation warning should be absent after deploy.

---

## 2. Current baseline

### Phase 0 — Pricing and public-site alignment
- Live API returns `settingsVersion: 3` with the final tariff.
- `/pricing` reads live API data; old prices removed.
- Testimonials nav links removed; hero rating preserved.
- Local `/pricing`, `/testimonials`, and `/how-it-works` routes restored during the local sync.

### Phase 1 — Security hardening
- Driver portal uses a per-driver **6-digit PIN** (bcrypt hash) plus a signed driver JWT in the `droovee_driver_at` httpOnly cookie (12-hour TTL).
- Admin can issue/reset a PIN with **Generate new portal PIN**; reset invalidates old driver sessions.
- Driver login requires identifier + PIN; the old unauthenticated name/regex lookup was removed.
- `/driver/me` and `/driver/logout` added.
- Driver portal actions derive `driverId` from the authenticated session, not client input.
- Trip start/end require valid 4-digit START/END codes.
- Driver “end” only sets `tripEndedByDriverAt`; admin completes the trip with the final fare.
- Cash collection requires an ended trip, rejects duplicates, caps at fare, and uses an atomic claim.
- Admin offline-payment rejects a second cash entry if cash is already recorded.
- Per-identifier driver login limit: 10 attempts / 15 minutes.
- Banned wording removed from shipped code and requirements.

### Verification
- API: build and typecheck pass ✅
- Web: typecheck and production build pass ✅ — **47 routes**
- Tests: **47 passing** (25 unit + 22 integration) ✅
- Integration tests use an in-memory MongoDB replica set by default, with a 120s startup allowance on Windows; `TEST_MONGODB_URI` can point them at an external test database.
- Manual alarm audio check: pending — needs a real browser with sound enabled.
- Local browser smoke test (2026-10-25): dashboard cleanup, new-booking alarm banner, mute/acknowledge, reload persistence, and 10-second repeat all behaved correctly; actual sound and the 2-minute cutoff still need the owner’s check.
- Local browser smoke test (2026-10-25, booking simplification): landing → login gate → signed-in `/book` → **Book Now** → confirmation passed; `/book/user` redirect and `?service=` deep link also passed.

### Known local caveat
- `/book/user` now redirects to `/book`. Fast/guest booking is removed; historical guest bookings in production still exist as booking documents and are not migrated.

---

## 3. Phase 2 — Customer booking and tracking

**Goal:** finish the customer-facing booking journey and make every price/flow match the final tariff.

- [x] Adaptive booking forms for all 7 services:
  - Hourly, half-day, full-day
  - Monthly office schedule
  - Outstation one-way / round-trip with night halt
  - Airport/station pickup and drop
- [x] Single signed-in booking path:
  - One `/book` flow; guests are redirected to sign in or create a free account
  - Account details prefill the booking, with trip history under My Trips
  - Fast/guest booking removed from the web app, API, OTP purposes and booking model
- [x] Fare breakdown using the authoritative rates, including extra hours, night halt, and late-night surcharge.
- [x] Customer responsibility disclosure: toll, parking, fuel, outstation food/stay.
- [x] Tracking by Booking ID **or** mobile number, with a status timeline.
- [x] Self-service cancellation request within allowed states (signed-in and public tracking via booking ID + mobile).
- [ ] OTP delivery: add WhatsApp OTP verification.
  - [ ] Choose provider: Meta WhatsApp Cloud API (direct) or a BSP such as Twilio, Gupshup, Interakt, or AiSensy.
  - [ ] Implement a `WhatsAppOtpSender` behind the existing `OtpSender` interface; keep the dev sender for local work.
  - [ ] Add env keys: `OTP_PROVIDER=whatsapp`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_OTP_TEMPLATE_NAME`, `WHATSAPP_API_VERSION`.
  - [ ] Create and get approval for an authentication template with the 6-digit code and 5-minute expiry.
  - [ ] Add delivery-status webhook and a failure/fallback path.
  - [ ] Confirm the official number can be migrated to WhatsApp Business API, or provision a separate number.
- [x] Finish/verify forgot-password and reset-password flows.

**Status (2026-10-25):** booking, tracking, cancellation, and password-reset flows verified locally. OTP UI now hides automatically while OTP is disabled. Only WhatsApp OTP delivery remains, pending provider choice.

**Exit gate:** a signed-in customer can complete a booking, see a correct fare breakdown, and track it by ID or mobile.

---

## 4. Phase 3 — Admin and operations polish

**Goal:** close the remaining dispatch, cash, and audit gaps.

- [x] **Admin side panel:** remove the **Business** navigation entry. Keep the Business page/API intact for now unless a separate decision is made to retire or relocate it.
- [x] **Admin dashboard:** remove the **Company / Hiring incomplete** panel (the 4-driver missing-documents list). Keep driver records and onboarding in the Drivers area.
- [x] **New-booking alarm:** audible + persistent notification with acknowledge, mute toggle, and autoplay-safe unlock.
- [ ] Dispatch queue with status/service filters and search.
- [ ] Driver assignment conflict warnings and override reason (partly built).
- [ ] Driver contact confirmation logging: not contacted, contacted, confirmed, declined, unreachable.
- [ ] Fare adjustments with a mandatory reason and audit entry.
- [ ] Driver availability calendar and leave/block UX (API partly built).
- [ ] Cash ledger reconciliation and settlement reporting.
- [ ] Bulk driver PIN generation and onboarding.
- [ ] Support ticket and audit-log coverage checks.

**Exit gate:** admin can dispatch, resolve conflicts, record cash, and audit every sensitive change.

---

## 5. Phase 4 — Driver portal finish

**Goal:** complete the driver’s mobile workflow.

- [x] Driver schedule and upcoming trips view (day-grouped schedule + next-trip banner).
- [x] Leave/unavailable request submission (pending until admin approval; cancel pending; audited).
- [x] Trip-code and cash-collection UX polish (numeric code validation, fare/payment display, cash cap).
- [x] Session-expiry handling and clear re-login flow (401 redirect + login notice).
- [ ] Push/WhatsApp reminders for assigned trips (deferred pending provider decision).
- [ ] PWA offline behavior check.
- [x] Confirm drivers can only see their own assigned trips (integration test + cross-driver action 404).

**Status (2026-10-25):** first tranche complete locally. API tests pass 46/46; web build passes 47 routes. Push/WhatsApp reminders and PWA offline checks remain deferred.

**Exit gate:** a driver can log in, see the schedule, run a trip, record cash, and request leave from a phone.

---

## 6. Phase 5 — Security and release

**Goal:** close the remaining security items and prepare a clean release.

- [ ] **DR-SEC-003:** hash share tokens in the database (currently stored raw).
- [ ] **DR-SEC-007:** transactional booking creation (only driver assignment uses transactions today).
- [ ] **DR-SEC-008:** verify sensitive business/pricing endpoints are role-restricted.
- [ ] **DR-SEC-011:** add CSP and fuller security headers (only `nosniff` is set now).
- [ ] **Performance:** profile and improve live-site speed (Render cold starts/API latency, caching, bundle size, images). Local caching/compression/index/middleware work is implemented; deploy and measure before closing.
- [ ] Regression tests for status transitions, conflicts, and RBAC.
- [ ] Integration tests against a real MongoDB/Atlas test database (in-memory replica-set coverage is now in place).
- [x] CI gate for typecheck, build, and tests (`.github/workflows/ci.yml`).
- [ ] Final audit: pricing, official number, banned wording, testimonials nav.

**Exit gate:** security items closed, tests passing, and release checklist complete.

---

## 7. Pending operational items (deferred)

All open items below are **deferred to a later operations window** (owner decision 2026-10-25).

- [ ] **Deferred:** confirm the 2-minute alarm cutoff and cross-tab acknowledge in production.
- [ ] **Deferred:** investigate the Atlas **144.56 MB** data-size reading: the `droovee` database is under 2 MB, and the sample databases were not visible on the cluster used by the Render URI. Confirm the Atlas project/cluster being viewed; drop `sample_mflix` only if it is present there.
- [x] Update Render `MONGODB_URI` to the new `droovee` Atlas user.
- [x] Verify Render health and `/api/v1/services` after the switch. Verified 2026-10-24: health returns `{"status":"ok","db":"up"}`, services return `settingsVersion: 3` with the final tariff.
- [x] Release `a9bccef` merged and deployed; Render/Vercel public checks passed on 2026-10-25.
- [ ] **Deferred:** generate portal PINs for the 4 existing drivers via **Admin → Drivers → Generate new portal PIN** (needs an admin session).
- [ ] **Deferred:** rotate the Atlas password after Render is confirmed working (needs Atlas access).
- [ ] **Deferred:** delete the old Atlas user only after Render is confirmed on the new user (needs Atlas access).
- [x] Configure Vercel environment: `API_TARGET=https://droovee.onrender.com` and a server-only `JWT_ACCESS_SECRET` matching Render, so `/admin/*` middleware can verify tokens without an API round-trip. Confirmed by the owner on 2026-10-25.
- [ ] **Deferred:** run `npm run db:indexes` before the next schema/index change. No schema index definitions changed in this release, so existing indexes remain valid. Render Shell is unavailable on the Free plan; use a local `MONGODB_URI` run or Starter when needed.
- [ ] **Deferred:** Render always-on is **not** active: the service is on the Free plan (Shell unavailable, spins down after idle). Decide between Starter and accepting cold starts, or reinstate a keepalive.

---

## 8. Release checklist

> Detailed pre-push and post-deploy steps: `Droovee_GitHub_Push_Checklist.md`.

- [x] Top-priority updates implemented; owner confirmed the alarm sound on 2026-10-25 (2-minute cutoff and cross-tab checks pending).
- [x] Phase 2 customer flows complete for this release; WhatsApp OTP remains deferred.
- [x] API typecheck and build pass.
- [x] Web typecheck and production build pass.
- [x] Unit/integration tests pass (42/42).
- [x] Local changes committed on `release/2026-10-25`.
- [x] Owner approval received.
- [x] Release branch pushed and PR #4 merged (`a9bccef`).
- [x] Render and Vercel deploys verified (health, cache headers, gzip, admin 401, web routes).
- [ ] **Deferred:** Driver PINs issued and tested (needs an admin session).
