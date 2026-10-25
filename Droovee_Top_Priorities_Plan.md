# Droovee — Top Priorities Implementation Plan

> **Status:** Implemented locally on `release/2026-10-25`; awaiting owner review and push approval.
> **Created:** 2026-10-24
> **Implemented:** 2026-10-25
> **Scope:** Top priorities 1–6 below (admin cleanup, Mongoose warnings, new-booking alarm, live performance, CI/test coverage).
> **Not in this pass:** landing-page redesign, WhatsApp OTP implementation, driver PIN generation, Atlas user cleanup.
> **Follow-up on the same release branch:** Phase 2 customer booking, tracking, guest cancellation, and password-reset flows.
> **Push policy:** No push until every approved change is complete and reviewed.

---

## 0. Guardrails

- Do not reintroduce banned wording.
- Keep the official number `+91 81149 94367`.
- Keep the final tariff exactly as recorded.
- Keep `/testimonials` and the homepage testimonial section.
- Keep “Testimonials” out of desktop nav and mobile drawer.
- Keep the hero rating line unchanged.
- Keep the existing revenue access in the side panel. Do **not** remove revenue reporting.
- Keep the Business page and API. Remove only the side-panel navigation entry.
- Keep all driver records and onboarding. Remove only the dashboard “Company / Hiring incomplete” card.
- Do not delete or alter old settings.
- The plan was approved and implemented locally; production remains untouched until merge.

---

## 1. Priority 1 — Admin dashboard: remove revenue section only

### Files
- `droovee-web/src/app/(console)/admin/page.tsx`
- `droovee-api/src/routes/admin.ts` (payload cleanup)

### Changes
1. Remove the four dashboard revenue stat cards:
   - Revenue today (cash)
   - Revenue today (online)
   - Revenue this week (cash)
   - Revenue this week (online)
2. Remove the now-unused `revenue` variable and `money` import if nothing else uses it.
3. Keep the top operational stats:
   - Today’s bookings
   - Awaiting review
   - Need a driver
   - Active drivers
4. Remove the revenue aggregation from `GET /api/v1/admin/alerts` **only if no other screen consumes it**.
   - Confirmed: only the dashboard reads `alerts.revenue`.
   - This removes one MongoDB aggregation from every dashboard poll.
5. Do not touch:
   - `droovee-web/src/app/(console)/admin/payments/page.tsx`
   - `droovee-web/src/app/(console)/admin/reports/page.tsx`
   - Payment/report APIs.

### Revenue side-panel clarification
There is currently **no nav item literally labelled “Revenue.”** Revenue is available through:
- `Payments & reports` → `/admin/payments`
- `Reports` → `/admin/reports`

**Recommended default:** leave those entries exactly as they are. Do not rename or remove them.
If you want a literal `Revenue` label in the sidebar, that is a separate small change and must be approved explicitly.

### Acceptance
- Dashboard shows no revenue cards.
- Dashboard still shows the four operational stats.
- `Payments & reports` and `Reports` still show revenue.
- No unused imports or TypeScript errors.

---

## 2. Priority 2 — Remove “Business” from the admin side panel

### Files
- `droovee-web/src/components/AdminShell.tsx`

### Changes
1. Remove this nav entry only:
   ```ts
   { href: "/admin/business", label: "Business", perm: "pricing:write" }
   ```
2. Leave these untouched:
   - `droovee-web/src/app/(console)/admin/business/page.tsx`
   - `GET /api/v1/admin/business`
   - `PUT /api/v1/admin/business`
3. Direct navigation to `/admin/business` must still work for now.

### Acceptance
- Business no longer appears in the desktop sidebar or mobile menu.
- `/admin/business` still loads if opened directly.
- Business API still responds.
- No other nav item is removed or reordered.

---

## 3. Priority 3 — Remove the “Company / Hiring incomplete” dashboard card

### Files
- `droovee-web/src/app/(console)/admin/page.tsx`
- `droovee-api/src/routes/admin.ts`

### Changes
1. Remove the entire dashboard `Card` titled **Company**:
   - “Hiring incomplete”
   - The four driver rows with missing documents
2. Remove the `hiringGaps` query and payload from `GET /api/v1/admin/alerts` **only if no other screen consumes it**.
   - Confirmed: only the dashboard reads `alerts.hiringGaps`.
3. Do not change:
   - Driver records
   - Driver onboarding/hiring data
   - `/admin/drivers`
   - Driver APIs

### Acceptance
- No Company / Hiring incomplete card on the dashboard.
- No driver names or missing-document list on the dashboard.
- Driver records and onboarding still work at `/admin/drivers`.
- `hiringGaps` is not requested by the dashboard.

---

## 4. Priority 4 — Mongoose deprecation warning cleanup

### Files
- `droovee-api/src/routes/driver.ts:446`
- `droovee-api/src/lib/tokens.ts:107`
- Audit the remaining update calls in:
  - `droovee-api/src/services/assignment.ts`
  - `droovee-api/src/routes/admin.ts`
  - `droovee-api/src/routes/driver.ts`

### Changes
1. Replace:
   ```ts
   { new: false }
   ```
   with:
   ```ts
   { returnDocument: "before" }
   ```
   at both confirmed locations.
2. Audit all `findOneAndUpdate` / `findByIdAndUpdate` / `findOneAndReplace` calls.
3. Normalize any explicit return-document option to `returnDocument`.
4. Do not change query filters, atomic-claim conditions, or returned data semantics.

### Confirmed call sites to review
- `assignment.ts:91` — already uses `returnDocument: "after"`
- `admin.ts:644` — no return option; default behavior unchanged
- `admin.ts:793, 811, 837, 854, 869, 1138, 1241, 1497` — already use `returnDocument: "after"` or default
- `driver.ts:436` — fix `new: false`
- `tokens.ts:104` — fix `new: false`

### Acceptance
- No `the 'new' option ... is deprecated` warning during startup or normal booking/driver flows.
- Driver cash claim still returns the pre-update booking and rejects duplicates.
- Refresh-token rotation still has exactly one winner under concurrent use.
- API typecheck and unit tests pass.

---

## 5. Priority 5 — New-booking alarm

### Current gap
- `AdminShell` has no global alarm.
- The dashboard has a local beep, but:
  - It only runs while the dashboard is open.
  - It triggers on overdue/unassigned alerts, not specifically new bookings.
  - It uses a new `AudioContext` per beep.
  - There is no persistent acknowledge/dismiss banner.
  - There is no cross-page mute state.

### Design

**Delivery**
- Poll a lightweight authenticated endpoint every 15 seconds while the admin console is open.
- Do an immediate poll on tab focus and after reconnect.
- Polling is intentional: it is more reliable than SSE/WebSocket through the Vercel → Render proxy for this traffic level.
- Raise the staff API rate limit if needed. Current `adminLimiter` is 200 requests / 15 minutes; polling plus dashboard calls can approach that with multiple tabs.
  - Recommended: `adminLimiter` 600 / 15 minutes.
  - Keep auth and customer limits unchanged.

**New API**
```
GET /api/v1/admin/notifications/new-bookings?after=<ObjectId>&limit=20
```
- Permission: `bookings:read`
- `after` optional. On first call, return the current cursor and no alarm items.
- Query by `_id: { $gt: after }`, sorted ascending. This uses the default `_id` index and avoids a new index build.
- Return only:
  - `id`
  - `bookingNumber`
  - `serviceType`
  - `scheduledStart`
  - `customerName`
  - `createdAt`
  - `origin` (`customer` or `staff`, derived from the first `statusHistory` entry)
- Return `{ items, cursor, serverTime }`.
- Do not return phone numbers, addresses, or full booking documents.
- Default alarm behavior: alert on customer/guest bookings. Do **not** alarm for bookings created by staff in the admin console.
  - This avoids alarming the person who just entered a phone booking.
  - Can be changed to “alarm for all new bookings” if you prefer.

**Frontend**
- New component: `droovee-web/src/components/NewBookingAlarm.tsx`
- Mount it inside `AdminShell` so it exists on every admin page.
- Remove the dashboard-local beep and sound toggle to avoid duplicate audio.
- Header control: `Alerts on` / `Alerts muted`, persisted in `localStorage`.
- First user interaction unlocks audio:
  - Create/resume one `AudioContext` on the first click/keypress.
  - If sound is locked, show a small “Enable sound” prompt.
  - Never autoplay before interaction.
- Alarm sound:
  - No external asset. Use a short three-tone WebAudio pattern.
  - Repeat every 10 seconds while unacknowledged, up to 2 minutes.
  - The banner remains visible until acknowledged even after the sound stops.
- Persistent banner:
  - Fixed bottom-right, above other admin content.
  - Shows “New booking”, booking number, service, scheduled time, and customer name.
  - Actions: `View booking`, `Acknowledge`, `Acknowledge all`.
  - `aria-live="assertive"` and `role="alert"`.
- Persistence:
  - `localStorage` stores acknowledged booking IDs and mute state.
  - `sessionStorage` stores the active unacknowledged queue so a reload does not lose the banner.
  - Initial page load establishes a baseline and does not alarm for old bookings.
- Multiple tabs:
  - Listen to the `storage` event so acknowledging in one tab clears the banner in others.
  - Polling in each tab is acceptable; the rate limit is raised to cover it.
- Optional desktop notification:
  - Only request browser notification permission from an explicit header action.
  - Do not request permission on page load.
  - Recommended default: include it as an optional toggle, not required for the core alarm.

### Acceptance
- A new guest/website booking triggers the alarm on any admin page.
- No alarm on initial page load for existing bookings.
- No alarm for admin-created phone bookings by default.
- Sound is blocked gracefully until the admin enables it.
- Mute stops sound but the banner still appears.
- Acknowledge stops the sound and removes the banner.
- Banner stays until acknowledged.
- Reload does not re-alarm an acknowledged booking.
- Two tabs do not create duplicate acknowledged state.
- No alarm on status edits, page reloads, or a second poll of the same booking.

---

## 6. Priority 6 — Live performance

### Current measurements (2026-10-24)
- Vercel homepage first TTFB: ~3.05s
- Vercel homepage warm: ~0.30–0.65s
- Render `/api/v1/health` cold: ~4.35s
- Render `/api/v1/health` warm: ~0.76–1.26s
- Render `/api/v1/services` warm: ~0.78–1.70s
- Next.js build: 47 routes, shared First Load JS 103 kB, largest route 122 kB
- Middleware bundle: 34.4 kB

The web bundle is not the main problem. The main suspects are API cold start, admin middleware, and oversized admin API payloads.

### Workstream A — Render cold start
**Findings**
- `droovee-api/src/server.ts` runs:
  ```ts
  await mongoose.connect(config.mongoUri);
  await Promise.all([
    BookingModel.syncIndexes(),
    CustomerModel.syncIndexes(),
    DriverModel.syncIndexes(),
  ]);
  ```
- `syncIndexes()` runs on every cold start and can add seconds.
- Render free instances spin down after idle. A 4.35s first request is consistent with cold start.

**Changes**
1. Remove `syncIndexes()` from the request/startup path.
2. Add an explicit script:
   ```bash
   npm run db:indexes
   ```
   It connects, calls `syncIndexes()` once, and exits.
3. Run the index script manually during deployment, then keep startup limited to:
   - config validation
   - Mongo connect
   - settings load
   - HTTP listen
4. Disable automatic index creation in production:
   ```ts
   mongoose.connect(uri, { autoIndex: false })
   ```
   Keep local development behavior convenient.
5. Add response compression to the Express app.
6. Platform options, in order of preference:
   - **Preferred:** move Render to an always-on instance.
   - **Fallback:** keep the free instance and add a 10-minute keepalive ping.
   - A keepalive is a workaround, not a substitute for an always-on instance if admin usage is time-sensitive.

### Workstream B — Public API caching
- Current global middleware sets `Cache-Control: no-store` on every API response.
- Add route-level overrides for public, non-user-specific data:
  - `GET /api/v1/services`
  - `GET /api/v1/business`
- Recommended:
  ```http
  Cache-Control: public, max-age=60, stale-while-revalidate=300
  ```
- Keep `no-store` for:
  - `/health`
  - auth
  - bookings
  - admin
  - driver
  - ratings
- Keep ETag support and verify `304 Not Modified` behavior.
- Do not cache anything containing customer or staff data.

### Workstream C — Admin middleware
**Finding**
- `droovee-web/src/middleware.ts` calls `GET /api/v1/auth/me` on every `/admin/*` page load.
- It has a 3-second timeout.
- On a Render cold start of ~4.35s, the middleware times out and redirects the admin to login even though the API is merely waking up.
- This is both a performance and UX bug.

**Recommended fix**
- Verify the access JWT locally in middleware with `jose`:
  - Read `droovee_at`.
  - Verify HS256 signature using `JWT_ACCESS_SECRET`.
  - Check expiry and `kind === "staff"`.
  - If the access token is expired but a refresh cookie exists, allow the request through so the client can refresh.
  - If neither token is usable, redirect to login.
- Add `JWT_ACCESS_SECRET` to Vercel environment variables. This is a server-only secret.
- Keep API authorization as the source of truth; middleware is still only a routing guard.
- If you do not approve putting the JWT secret in Vercel, the fallback is:
  - Remove the API call from middleware.
  - Keep `AdminShell` client guard and enforce every API call server-side.
  - This loses the server-side redirect layer, so the JWT-verification option is preferred.

### Workstream D — Admin payload reduction
**Finding**
- Dashboard fetches `/admin/bookings?limit=200`.
- The list endpoint returns full `adminBookingView` objects, including `statusHistory`, `contactLog`, `fareAdjustments`, and cancellation data.
- The list sorts by `scheduledStart` ascending across all statuses, so old completed bookings can crowd out open bookings.
- `/admin/alerts` also runs a revenue aggregation, a hiring-gaps query, a 200-row schedule query, low ratings, and business lookup on every poll.

**Changes**
1. Add an `openOnly` filter to `GET /api/v1/admin/bookings`:
   - Excludes terminal statuses: `completed`, `cancelled`, `rejected`, `customer_no_show`.
2. Add a summary projection for the list endpoint:
   - Keep fields needed by list/table views.
   - Keep the full view for `GET /admin/bookings/:id`.
3. Dashboard calls:
   ```text
   /admin/bookings?openOnly=true&limit=8
   ```
4. Remove `revenue` and `hiringGaps` from `/admin/alerts`.
5. Keep `scheduleToday`, `urgentNoDriver`, `unassignedOverdue`, `lowRatings`, `remindersDue`.
6. Re-test that the dashboard still shows:
   - Open bookings
   - Today’s schedule
   - Action needed
   - Low ratings
   - Driver reminders

### Workstream E — Web bundle and images
- Current shared JS is 103 kB and the largest page is 122 kB. Do not add heavy libraries for this pass.
- Replace raw `<img>` with `next/image` where the image source is stable and same-origin, especially driver photos.
- Add width/height or aspect ratio to prevent layout shift.
- Lazy-load below-the-fold images.
- Defer any larger redesign work; it is not the cause of the live slowdown.

### Performance acceptance targets
- Warm `/api/v1/services` from Vercel: target under ~500 ms.
- Warm `/api/v1/health`: target under ~400 ms.
- Cold start: target under ~2.5 s with an always-on instance or keepalive.
- Admin page load: no 3-second middleware timeout/redirect on a warming API.
- Dashboard no longer downloads 200 full booking records.
- `/api/v1/services` and `/api/v1/business` return a cacheable header.
- Build still produces 47 routes and passes typecheck.
- No public or customer data is cached.

---

## 7. Recommended implementation order

1. **Admin cleanup** — remove revenue cards, Company card, and Business nav. Low risk, immediately visible.
2. **Mongoose warning fix** — two explicit changes plus audit. Low risk, quick.
3. **Alarm API + global alarm component** — higher value; can be built on the cleaned admin shell.
4. **Performance quick wins** — startup index removal, compression, public caching, middleware JWT, dashboard payload reduction.
5. **Full verification** — API typecheck, web build, manual alarm test, live timing sample.
6. **Review with owner** — no push until approval.

Rationale: the alarm is operationally urgent; performance work touches the same admin shell and dashboard, so the shell should be cleaned first, then performance changes can be measured without alarm-related noise.

---

## 8. Test plan

### Automated
- API: `npx tsc --noEmit`
- API: `npm test` (unit tests)
- Web: `npm run typecheck`
- Web: `npm run build`
- Confirm 47 routes and no new warnings.

### Manual API
- Driver cash claim:
  - Claim once → succeeds with pre-update booking.
  - Claim twice → second attempt rejected.
- Refresh-token rotation:
  - Concurrent rotation → exactly one winner, no family-wide false theft revocation.
- New-booking endpoint:
  - First call returns cursor, no items.
  - New guest booking appears on the next poll.
  - Admin-created booking is marked `origin: staff`.
  - Permission denied for non-staff.
- `/admin/alerts` no longer returns revenue/hiring gaps.

### Manual web
- Dashboard:
  - No revenue cards.
  - No Company card.
  - Operational stats, open bookings, schedule, action needed, low ratings, reminders still render.
- Sidebar:
  - No Business link.
  - `/admin/business` still opens directly.
  - Payments & reports and Reports still show revenue.
- Alarm:
  - Guest booking → sound + banner.
  - Acknowledge → stops.
  - Mute → no sound, banner still appears.
  - Reload → no duplicate alarm.
  - Two tabs → acknowledge in one clears the other.
  - Background tab → on focus, immediate poll and banner.
- Performance:
  - Run 5 cold/warm probes for `/`, `/pricing`, `/admin`, `/api/v1/health`, `/api/v1/services`.
  - Confirm cache headers.
  - Confirm no admin login redirect while API is warming.

### Blocker to note
- `MONGOMS_STARTUP_TIMEOUT=120000` now starts the in-memory Mongo replica set, but the integration suite still fails on pre-existing OTP-required registration assertions. Unit tests pass; use local/staging for the remaining manual API checks.
- The `npm test` wrapper passes `dist/test` as a directory, which Node 22 rejects. Run the unit files explicitly (or fix the wrapper separately).

---

## 9. Risks and decisions needed

### Decision 1 — Revenue side-panel label
There is no literal `Revenue` nav item today. Revenue is under `Payments & reports` and `Reports`.
- **Recommended:** keep those labels as they are.
- Alternative: add a literal `Revenue` entry pointing to `/admin/payments`.

### Decision 2 — Alarm scope
- **Recommended:** alarm only for customer/guest bookings; do not alarm for admin-created phone bookings.
- Alternative: alarm for every new booking, including staff-created ones.

### Decision 3 — Render performance approach
- **Recommended:** always-on Render instance.
- Fallback: free instance + 10-minute keepalive ping.
- This is a cost/ops decision, not just code.

### Decision 4 — Vercel JWT secret
- **Recommended:** add `JWT_ACCESS_SECRET` to Vercel so middleware can verify the access token locally.
- Fallback: remove the middleware API call and rely on the client guard + API authorization.
- This is needed to remove the 3-second admin login timeout.

### Decision 5 — Alarm sound behavior
- **Recommended:** repeat a short three-tone pattern every 10 seconds for up to 2 minutes, while the banner stays until acknowledged.
- Alternative: one sound burst only.

### Risks
- Removing `syncIndexes()` from startup requires a deliberate index migration. If the index script is not run, queries can be slower after a schema change.
- Middleware JWT verification duplicates token verification logic and requires secret rotation discipline across Render and Vercel.
- Polling alarm increases admin API traffic; the rate limit and interval must be tuned together.
- Public API caching can serve stale pricing for up to 60 seconds. This is acceptable for this business, but must not be used for booking creation or fare estimation.
- Local integration coverage is limited by the MongoDB memory-server issue; manual smoke tests are required.

---

## 10. Approval checklist

- [ ] Approve admin cleanup: remove dashboard revenue cards, Company card, and Business nav.
- [ ] Confirm revenue side-panel handling (keep `Payments & reports` / `Reports`, or add a literal `Revenue` link).
- [ ] Approve Mongoose warning cleanup.
- [ ] Approve alarm scope (customer/guest only by default).
- [ ] Approve alarm sound behavior (repeat until acknowledged/muted, max 2 minutes).
- [ ] Approve performance changes:
  - [ ] Remove `syncIndexes()` from startup and add an explicit index script.
  - [ ] Add response compression.
  - [ ] Cache public `/services` and `/business` responses.
  - [ ] Verify JWT in middleware using `JWT_ACCESS_SECRET`.
  - [ ] Reduce dashboard payloads with `openOnly` and summary projections.
- [ ] Confirm Render approach: always-on instance or keepalive ping.
- [ ] Confirm no push until final review.

**Reply “approved” to start with the recommended defaults, or list any changes to the decisions above.**
