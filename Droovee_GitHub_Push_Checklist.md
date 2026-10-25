# Droovee — GitHub Push & Deploy Checklist

Last updated: **2026-10-25**

> **Hard rule:** do not push until the owner has reviewed and approved the local changes.

Current state: implementation and local verification are **committed** on `release/2026-10-25`. Nothing has been pushed, and no PR is open. Owner review and explicit approval are still required.

---

## 0. Current repository situation

- `origin/main`: `9344713` (CI workflow already merged).
- Clean release branch: `release/2026-10-25`, created from `main`.
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

- [ ] Vercel has `API_TARGET=https://droovee.onrender.com`.
- [ ] Vercel has `JWT_ACCESS_SECRET` set to the **same value** as Render.
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
- [ ] Staff-created booking does **not** trigger the alarm in the browser.
- [ ] Click once in the console, then confirm the alarm sound plays.
- [ ] Sound repeats every 10 seconds and stops after 2 minutes.
- [x] Mute silences the alarm but keeps the banner.
- [x] Acknowledge clears the banner and the queue.
- [ ] Reload with an unacknowledged banner restores the banner and shows **Enable sound**.
- [ ] Two tabs show the banner; acknowledging in one clears it in both.
- [ ] Guest cancellation rejects a mismatched mobile number and accepts a matching one.
- [ ] Forgot-password/reset-password works with the local debug link.

### 1.5 Owner approval gate

- [ ] Show the diff and test/build results to the owner.
- [ ] Owner confirms all changes are complete and approves the push.
- [ ] Only then push the release branch and open the PR.

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

- [ ] `API_TARGET=https://droovee.onrender.com`
- [ ] `JWT_ACCESS_SECRET=<same value as Render>`

Redeploy Vercel after changing environment variables. Without the secret, middleware falls back to `/auth/me`, which works but adds an API round-trip.

### 3.2 Verify Render API deploy

- [ ] Render build succeeds.
- [ ] Render starts without startup index sync.
- [ ] `/api/v1/health` returns `{"status":"ok","db":"up"}`.

### 3.3 Run the index sync once

After the new API build is live, open the Render shell and run:

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

### 3.5 Verify admin and alarm behavior in production

- [ ] Staff login works on Vercel.
- [ ] Admin routes do not redirect-loop.
- [ ] Expired access token with a valid refresh cookie still loads the admin shell.
- [ ] Guest booking shows the alarm banner.
- [ ] Staff-created booking does not alarm.
- [ ] Sound repeats at 10 seconds and stops after 2 minutes.
- [ ] Mute, acknowledge, reload, and two-tab behavior work.
- [ ] Normal admin usage does not hit a 429 rate limit.

### 3.6 Render always-on

- [ ] Preferred: move Render to an always-on instance.
- [ ] Fallback: configure a 10-minute keepalive ping.
- [ ] Confirm `/api/v1/health` is responsive after an idle period.

### 3.7 Monitor after deploy

- [ ] Render logs: no Mongo connection, index, or unconfirmed-settings errors.
- [ ] Vercel logs: no middleware/JWT errors.
- [ ] No spike in 401/403/429 responses.
- [ ] Admin alarm poll returns 200.

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

- [ ] Add `JWT_ACCESS_SECRET` to Vercel.
- [ ] Run `npm run db:indexes` on Render.
- [ ] Configure Render always-on or keepalive.
- [ ] Generate portal PINs for the four existing drivers.
- [ ] Rotate the Atlas password after Render is confirmed stable.
- [ ] Delete the old Atlas user only after Render is confirmed stable.
- [ ] Choose an SMS/WhatsApp OTP provider and credentials.
- [ ] Verify the 144.56 MB Atlas data-size reading and drop sample databases only if present.
- [ ] Recheck final pricing, official number `+91 81149 94367`, testimonials behavior, and hero rating.

---

## 6. Reference

- `Droovee_Top_Priorities_Plan.md` — approved scope and acceptance criteria.
- `Droovee_Next_Updates.md` — phase roadmap and deployment notes.
- `droovee-web/.env.example` — Vercel `API_TARGET` and `JWT_ACCESS_SECRET`.
- `droovee-api/.env.example` — API environment and index-sync note.

**Last gate:** owner approval. **No push without it.**
