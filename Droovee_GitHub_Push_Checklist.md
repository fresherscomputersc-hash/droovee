# Droovee — GitHub Push & Deploy Checklist

Last updated: **2026-10-25**

> **Hard rule:** do not push directly to `main`; merge through a PR with passing CI.

Current state: the release was **merged and deployed** on 2026-10-25. PR #4 squash-merged as `a9bccef`; main CI passed; Render and Vercel are serving the new build. Remaining items are admin PIN generation, Atlas rotation, a deferred index sync, and two alarm checks (2-minute cutoff and cross-tab acknowledge). The owner confirmed the alarm sound on 2026-10-25.

---

## 0. Current repository situation

- `origin/main`: `a9bccef` (release squash merge; previous CI commit `9344713`).
- Branch protection on `main` requires the live check names `API build and tests` and `Web typecheck and build`.
- Clean release branch: `release/2026-10-25`, created from `main` and merged through PR #4.
- Earlier integration branch: `release/next`; it contains paused landing-preview work and unrelated frontend WIP. **Do not push it.**
- Backup branch: `wip/priority-updates-20261025` (`b3ed09d`).
- The clean branch deliberately excludes `PublicShell.tsx`, `Calculator.tsx`, the landing preview, and `tsconfig.tsbuildinfo`.
- The clean branch includes the top-priority admin/performance/alarm work, Phase 2 customer flows, API integration tests, and release documentation.
- Do **not** run `git add -A` on `release/next`.

---

## 1. Before pushing

### 1.1 Confirm the release scope

```powershell
git status --short
git log --oneline main..HEAD
git diff --stat main...HEAD
git diff --check
```

Confirm the diff contains only the agreed release work. Expected areas:

- Admin dashboard/nav cleanup and the new-booking alarm.
- API performance/caching, index-sync script, and Mongoose deprecation fixes.
- Phase 2 booking, tracking, guest cancellation, password reset, and OTP-status handling.
- API integration tests and release documentation.
- Server-only web middleware JWT verification and `jose`.

Never commit:

- `.env`, `.env.local`, or any real secret
- Atlas connection strings
- database dumps
- `node_modules`, `dist`, `.next`
- logs, screenshots, `tmp-*` scripts
- local backup files

Confirm secrets are ignored:

```powershell
git check-ignore -v droovee-api/.env droovee-web/.env.local
```

### 1.2 Run the release checks

From `droovee-api`:

```powershell
npm test
```

This builds the API and runs **42 tests** (25 unit + 17 integration). The integration suite starts an in-memory MongoDB replica set with a 120s startup allowance; set `TEST_MONGODB_URI` to use an external test database instead.

From `droovee-web`:

```powershell
npm run typecheck
npm run build
```

Expected local web build: **47 routes**.

### 1.3 Environment readiness — do this before pushing

- [x] Vercel has `API_TARGET=https://droovee.onrender.com`. Confirmed by the owner on 2026-10-25.
- [x] Vercel has `JWT_ACCESS_SECRET` set to the **same value** as Render. Confirmed by the owner on 2026-10-25.
- [ ] Render has the matching `JWT_ACCESS_SECRET`.
- [ ] No secret has been pasted into a tracked file.

Vercel applies environment changes on the next deployment. Setting them before the push avoids an extra redeploy and ensures the first deploy uses JWT verification instead of the `/auth/me` fallback.

### 1.4 Manual browser checks

Local smoke test on 2026-10-25 (in-memory Mongo + local API/web) verified:

- Staff login and admin dashboard load.
- No dashboard revenue cards, no Company/Hiring panel, and no **Business** sidebar entry; `Payments & reports` and `Reports` remain.
- A guest booking produced the alarm banner with the correct booking number; a staff booking is classified as `staff` by the API.
- The alarm audio context unlocked after a click and created repeated tones at the 10-second interval (instrumented count; actual sound still needs the owner’s ears).
- Mute kept the banner but produced no audio; acknowledge/view cleared the banner; reload restored the unacknowledged banner.

Use a local API + web server and a real browser for the remaining checks:

- [x] Owner login works.
- [x] Dashboard has no revenue cards.
- [x] Dashboard has no Company/Hiring card.
- [x] Sidebar has no **Business** entry.
- [x] `Payments & reports` and `Reports` remain.
- [x] Guest booking triggers the alarm banner.
- [ ] Staff-created booking does **not** trigger the alarm in the browser (API classifies staff bookings as `staff`; browser check still pending).
- [x] Confirm the alarm sound plays (owner confirmed in production, 2026-10-25).
- [ ] Confirm the 2-minute cutoff: the tone stops but the banner remains.
- [x] Mute silences the alarm but keeps the banner.
- [x] Acknowledge clears the banner and the queue.
- [x] Reload with an unacknowledged banner restores the banner and shows **Enable sound**.
- [ ] Two tabs show the banner; acknowledging in one clears it in both.
- [x] Guest cancellation rejects a mismatched mobile number and accepts a matching one.
- [x] Forgot-password/reset-password works with the local debug link.

### 1.5 Owner approval gate

- [x] Show the diff and test/build results to the owner.
- [x] Owner confirms all changes are complete and approves the push.
- [x] Only then push the release branch and open the PR.

---

## 2. Commit and push after approval

The reviewable commits already exist on `release/2026-10-25`. If further review changes are needed:

```powershell
git add <reviewed files>
git commit -m "<clear, scoped message>"
```

Push the release branch first:

```powershell
git push -u origin release/2026-10-25
```

Open a pull request into `main`. Do **not** push directly to `main`.

**Completed:** PR #4 squash-merged into `main` as `a9bccef` on 2026-10-25. Main CI passed: `API build and tests` and `Web typecheck and build`.

Before opening the PR, inspect the **Files changed** tab for:

- any real `.env` file or secret
- unrelated pre-existing work
- generated files (`dist`, `.next`, logs, screenshots)
- temporary scripts

If direct `main` push is approved (not the default):

```powershell
git switch main
git merge --ff-only release/2026-10-25
git push origin main
```

Do not push `release/next` or the backup branch.

---

## 3. After push — deployment order

### 3.1 Set Vercel environment before the web deploy

- [x] `API_TARGET=https://droovee.onrender.com`
- [x] `JWT_ACCESS_SECRET=<same value as Render>`

Redeploy Vercel after changing environment variables. Without the secret, middleware falls back to `/auth/me`, which works but adds an API round-trip.

### 3.2 Verify Render API deploy

- [x] Render build succeeds (new cache headers observed on 2026-10-25).
- [x] Render starts without startup index sync (no startup failure; health is up).
- [x] `/api/v1/health` returns `{"status":"ok","db":"up"}` (verified 2026-10-25).

### 3.3 Run the index sync once

**Status:** deferred by the owner on 2026-10-25. No schema/index definitions changed in this release, so previously built indexes remain in place; this is a verification/hygiene step, not a new-index deploy. Run it before the next schema/index change. Render Shell is unavailable on the Free plan; use the local `MONGODB_URI` method or upgrade to Starter when it is needed.

When Shell is available (Starter plan), open the Render shell and run:

```powershell
npm run db:indexes
```

If the Render shell does not have dev dependencies or TypeScript, run the already-built script directly:

```powershell
node dist/src/scripts/sync-indexes.js
```

Before running either command:

- [ ] Confirm the Render shell is using the production `MONGODB_URI`.
- [ ] Take an Atlas backup/snapshot or confirm no custom indexes exist.
- [ ] Remember `syncIndexes` can drop indexes that are not in the Mongoose schemas.

Then verify the app still reads and writes normally.

> Production now starts with Mongoose `autoIndex` disabled. If this script is not run after a schema/index change, indexes and TTL cleanup may be missing.

### 3.4 Verify public caching and compression

Wait for both the Render and Vercel deployments to finish before testing.

```powershell
curl.exe --compressed -sI https://droovee.onrender.com/api/v1/services
curl.exe --compressed -sI https://droovee.onrender.com/api/v1/business
curl.exe -sI https://droovee.onrender.com/api/v1/admin/alerts
```

Expected:

- `/services`: `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `/business`: `Cache-Control: public, max-age=300, stale-while-revalidate=600`
- `/admin/*`: `Cache-Control: no-store`; an unauthenticated request should return `401` but still carry this header.
- `/services` should return `Content-Encoding: gzip` when requested with `Accept-Encoding: gzip`.

**Verified 2026-10-25 (production):**

- [x] `/api/v1/services` → `200`, short cache header, `Content-Encoding: gzip`, `settingsVersion: 3`, 7 service types, 6 packages.
- [x] `/api/v1/business` → `200`, `max-age=300` cache header.
- [x] `/api/v1/admin/alerts` → `401` with `Cache-Control: no-store` and `UNAUTHENTICATED`.
- [x] Web `/`, `/login`, `/register`, `/book`, `/track`, `/pricing` → `200`; `/admin` → `307` to `/admin/login?from=%2Fadmin`.
- [x] Deployed `/track` bundle contains the new guest-cancellation code, confirming Vercel is serving this release.

### 3.5 Verify admin and alarm behavior in production

- [ ] Staff login works on Vercel.
- [x] Admin routes do not redirect-loop (unauthenticated `/admin` redirects once to `/admin/login`).
- [ ] Expired access token with a valid refresh cookie still loads the admin shell.
- [x] Guest booking shows the alarm banner (owner confirmed in production, 2026-10-25).
- [x] Alarm sound plays (owner confirmed in production, 2026-10-25).
- [ ] Staff-created booking does not alarm in the browser.
- [ ] Confirm the 2-minute cutoff: the tone stops but the banner remains.
- [ ] Confirm two-tab behavior: acknowledging in one tab clears the other.
- [ ] Normal admin usage does not hit a 429 rate limit.

> Local smoke test covered login, alarm banner classification, mute, acknowledge, reload persistence, and the 10-second repeat. The owner confirmed the alarm sound in production on 2026-10-25. The staff-booking, 2-minute cutoff, and two-tab checks remain.

### 3.6 Render plan and always-on

- [ ] Render is on the **Free** plan, so the service spins down after idle and Shell is unavailable. Always-on/keepalive is **not** active despite the earlier confirmation.
- [x] `/api/v1/health` responsive on the post-deploy checks (2026-10-25).
- [ ] Decide whether to upgrade to Starter (Shell + always-on) or accept cold starts on the first request after idle.
- [ ] If staying on Free, confirm the cold-start behavior is acceptable (or reinstate a keepalive).

### 3.7 Monitor after deploy

- [ ] Render logs: no Mongo connection, index, or unconfirmed-settings errors.
- [ ] Vercel logs: no middleware/JWT errors.
- [ ] No spike in 401/403/429 responses.
- [ ] Admin alarm poll returns 200.

> Log checks require dashboard access. Public probes showed no 5xx during verification.

---

## 4. Rollback

If the deploy causes a problem:

- **Vercel:** roll back to the previous deployment.
- **Render:** redeploy the previous successful commit.
- **Git:** `git revert <commit>` and push the revert.
- Do not delete the old Atlas user until Render has been stable on the new user.
- If the index sync caused an issue, inspect the dropped indexes before rerunning anything.

---

## 5. Outstanding operational items

These are not blockers for the push, but they must be handled before considering the release finished:

- [x] Merge PR #4 and deploy `a9bccef` to production (2026-10-25).
- [x] Add `JWT_ACCESS_SECRET` to Vercel (owner confirmed 2026-10-25).
- [x] Alarm sound confirmed by the owner in production (2026-10-25).
- [ ] Confirm the 2-minute cutoff and cross-tab acknowledge in production.
- [ ] Decide on the Render plan: Free (cold starts, no Shell) vs Starter (always-on + Shell). Always-on is not active today.
- [ ] Run `npm run db:indexes` before the next schema/index change — deferred on 2026-10-25; no index changes in this release.
- [ ] Generate portal PINs for the four existing drivers — needs an admin session.
- [ ] Rotate the Atlas password after Render is confirmed stable — needs Atlas access.
- [ ] Delete the old Atlas user only after Render is confirmed stable — needs Atlas access.
- [ ] Choose an SMS/WhatsApp OTP provider and credentials.
- [ ] Verify the 144.56 MB Atlas data-size reading and drop sample databases only if present.
- [x] Recheck final pricing, official number `+91 81149 94367`, testimonials behavior, and hero rating on production (official number and pricing present in the deployed page/settings).

---

## 6. Reference

- `Droovee_Top_Priorities_Plan.md` — approved scope and acceptance criteria.
- `Droovee_Next_Updates.md` — phase roadmap and deployment notes.
- `droovee-web/.env.example` — Vercel `API_TARGET` and `JWT_ACCESS_SECRET`.
- `droovee-api/.env.example` — API environment and index-sync note.

**Last gate:** owner approval. **No push without it.**
