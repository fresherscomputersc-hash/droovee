# Droovee — Testing Guide (Windows)

How to run the security checks and k6 load tests in this repository.

## 1. Prerequisites

- Windows 10/11 with PowerShell 5.1+ and `curl.exe` (built in).
- Node.js 20+ (repo built with v22) and npm.
- Grafana k6 v2.x:
  ```powershell
  # latest release zip → extract anywhere, e.g. %TEMP%\opencode\k6
  $rel = Invoke-RestMethod https://api.github.com/repos/grafana/k6/releases/latest
  $url = "https://github.com/grafana/k6/releases/download/$($rel.tag_name)/k6-$($rel.tag_name)-windows-amd64.zip"
  Invoke-WebRequest $url -OutFile k6.zip; Expand-Archive k6.zip k6-dir
  .\k6-dir\k6-v*-windows-amd64\k6.exe version
  ```
- Optional for API tests locally: MongoDB (or rely on `mongodb-memory-server` used by the test suite).

## 2. Environment variables (no secrets in scripts)

| Variable | Where | Used by | Example |
|---|---|---|---|
| `BASE_URL` | k6 `-e` flag | all scenarios | `https://droovee.vercel.app` (default) or `http://localhost:3000` |
| `RAMP` | k6 `-e` flag | all scenarios | `smoke`, `v1`, `v5`, `v10`, `v25`, `v50`, `v100`, `v200`, `v300`, `v400`, `v500` |
| `THINK_MS` | k6 `-e` flag | all scenarios | `3000` default; keep ≥ `5000` against production to respect rate limits |
| `P95_MS`, `FAILED_TOL` | k6 `-e` flag | thresholds | `2000`, `0.01` |
| `API_TARGET` | web build env (server-side) | Next.js proxy | `http://127.0.0.1:4000` locally |
| `JWT_ACCESS_SECRET`, `TOKEN_PEPPER`, `MONGODB_URI` | `droovee-api/.env` (from `.env.example`) | API | never commit real values |

The repository's `.env` files are gitignored. **Never paste real secrets into k6 scripts, docs, or issues.**

## 3. Running the API locally

```powershell
cd droovee-api
copy .env.example .env   # then edit secrets: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
npm install
npm run build
npm test                 # integration + unit tests (in-memory Mongo replica set)
npm start                # serves http://127.0.0.1:4000
```

## 4. Running the web frontend locally

```powershell
cd droovee-web
npm install
$env:API_TARGET = "http://127.0.0.1:4000"
npm run dev              # http://localhost:3000 (proxies /api/v1 to the API)
```

## 5. Running load tests

```powershell
$k6 = "$env:TEMP\opencode\k6\k6-v2.3.0-windows-amd64\k6.exe"   # adjust to your path

# Smoke first — always
& $k6 run load-tests\homepage.js
& $k6 run load-tests\api-public.js
& $k6 run load-tests\track.js

# Escalate one stage at a time; review output before the next stage
& $k6 run -e RAMP=v1  load-tests\homepage.js
& $k6 run -e RAMP=v5  -e THINK_MS=8000 load-tests\homepage.js
# ... v10, v25 (owner pre-approved) — v50+ requires explicit owner approval per stage

# Against local stack
& $k6 run -e BASE_URL=http://localhost:3000 -e RAMP=smoke load-tests\homepage.js

# Export per-run summary for the performance report
& $k6 run -e RAMP=v10 --summary-export=results-v10.json load-tests\homepage.js
```

### Reading the output
- `http_req_failed` counts non-2xx/3xx **plus** network errors. For `track.js`, 404/429 are declared expected via `responseCallback`.
- `homepage_status{status:200}` / `{status:403}` submetrics separate real responses from Vercel Security Checkpoint blocks.
- `Ratelimit` response headers (API) show the remaining per-IP budget: `limit=1000;w=900`.

## 6. Known constraints (production)

1. **API rate budget:** 1000 requests/15 min per IP globally; `/pricing/estimate` + `/bookings/track` share 120/15 min. Keep `THINK_MS ≥ 5000` and stage small.
2. **Vercel Security Checkpoint:** sustained automated traffic from one IP gets 403 challenge pages. Measured ceiling: ~5 VUs / 0.6 rps reliable, ~1.4 rps fully blocked. For stages above that, use a staging deployment or distributed/multi-IP generators — **production protections were deliberately not bypassed or weakened (owner decision, 2026-10-17), and no bypass rules exist.**
3. **Read-only scope:** no booking writes, payments, emails, SMS/OTP, or login attempts in production tests (owner directive).

## 7. Report locations

| Artifact | Path |
|---|---|
| Security audit | `SECURITY_AUDIT.md` |
| Load-test plan | `LOAD_TEST_PLAN.md` |
| Security procedures | `SECURITY_TESTS.md` |
| Performance results | `PERFORMANCE_REPORT.md` |
| Remediation checklist | `FIXES.md` |
| k6 scripts | `load-tests/*.js` (config in `load-tests/lib/config.js`) |
| Raw k6 summaries | `%TEMP%\opencode\k6-results\*-summary.json` (session machine) |

## 8. Cleanup

- Load tests are read-only — nothing to clean in production.
- Local test data: `npm test` uses an ephemeral in-memory DB; manual local bookings can be removed with `db.bookings.deleteMany({ bookingNumber: /^DRV-T/ })` style filters on your local DB only.
- Uploaded PoC files (staging only): delete from `droovee-api/uploads/car-photos/`.
- **No production settings were changed during this engagement** (no firewall/WAF/bypass rules added, no deployments, no code changes) — there is nothing to revert. If the owner later chooses to change any protection settings for their own testing, that is their explicit decision and separate action.
