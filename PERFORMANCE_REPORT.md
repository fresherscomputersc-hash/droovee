# Droovee — Performance Report

**Test date:** 2026-10-17 (12:15–13:30 IST, single session).
**Target:** https://droovee.vercel.app/ — production (Vercel edge `bom1` → Vercel Security Checkpoint → Cloudflare → Render API → MongoDB). No staging environment exists.
**Owner-approved scope:** read-only traffic; gradual ramp 1→5→10→25 pre-approved, 50+ per-stage approval; no booking writes, payments, emails, SMS/OTP, logins; synthetic data only; stop on error/latency spikes or hosting-protection activation.

---

## 1. Environment and methodology

| Item | Value |
|---|---|
| Test generator | Single host: Windows 10 Home 19041, PowerShell 5.1, **AMD Ryzen 5 3500U (4 cores)**, **5.9 GB RAM**, consumer broadband, India (IPv4 `49.42.135.156`, IPv6 `2409:40e2:100a:8b6c:1cf3:e80b:a50c:5ee2`) |
| Tool | Grafana k6 **v2.3.0** (Go 1.26.8), browser-like headers on HTML routes, `gracefulRampDown 30s` |
| Scripts | `load-tests/homepage.js`, `load-tests/api-public.js`, `load-tests/track.js` (env: `BASE_URL`, `RAMP`, `THINK_MS`) |
| Think time | 2–8 s per iteration (models humans; keeps within per-IP rate budget) |
| Server-side monitoring | **None available** — no Vercel/Render/MongoDB dashboard access. Client-side metrics, HTTP status distribution, response headers (`Ratelimit`, `X-Vercel-Cache`, `X-Render-Origin-Server`) and health probes only. |
| Raw summaries | `%TEMP%\opencode\k6-results\*.json` (this session machine) |

**Status labels used below:** *Executed* (run + recorded), *Prepared, not executed* (script ready, stage not run), *Blocked* (attempted, prevented by protections), *Not started*.

---

## 2. Baseline latency (zero load, sequential curl — Executed)

| Endpoint | Samples | Range (total) | Notes |
|---|---|---|---|
| `GET /` (document) | 4 | 0.33–0.56 s | `X-Vercel-Cache: HIT` mostly |
| `GET /api/v1/health` | 3 | 0.83–1.54 s | DB ping on every call |
| `GET /api/v1/services` | 12 | **0.81–3.79 s** | median ≈ 1.1 s, no cache, DB query per request |
| `GET /api/v1/bookings/track` (404) | 1 | 1.23 s | DB lookup path |
| 7 static assets (one-time inventory) | 7 | 0.36–0.71 s | HTML 41.7 kB; CSS 43.9 kB; JS ≈ 215 kB uncompressed total (largest chunk 173 kB) |

**Finding:** the API path is **0.6–3 s slower than the edge-served frontend at zero load**, per request, on every call.

---

## 3. Stage results — frontend (`homepage.js`)

| # | Stage | Think | Requests | 200 | 403 (checkpoint) | Net fail | p50 | p95 | max | Fail rate | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | smoke 1 VU/20 s | 3 s | 6 | 6 | 0 | 0 | 692 ms | 924 ms | 948 ms | **0%** | Executed ✅ |
| 1 | 1 VU/30 s | 2 s | 11 | 11 | 0 | 0 | 204 ms | 2.88 s | 5.07 s | **0%** | Executed ⚠️ p95 (1 outlier) |
| 2a | 5 VU/30 s | 2 s | 36 | 20 | 16 | 0 | 122 ms | 763 ms | 1.29 s | 44% blocked | Executed ⚠️ |
| 2b | 5 VU/30 s | 8 s (rerun) | 8 | 6 | 0 | 2×30 s timeout | — | 26.2 s | 30 s | 25% | Executed ⚠️ transient* |
| 2c | 5 VU/30 s (rerun 2) | 8 s | 10 | 10 | 0 | 0 | 176 ms | **238 ms** | 261 ms | **0%** | Executed ✅ |
| 3 | 10 VU/1 min | 8 s | 32 | 20 | 8 | 4 | 167 ms | 19.3 s | 19.3 s | **37.5%** | Executed ❌ over target |
| 3b | 10 VU/1 min | 3 s | 90 | 0 | 90 | 0 | — | — | — | **100% blocked** | Executed ❌ |
| 4 | 1 VU/30 s (decay probe) | 5 s | 6 | 6 | 0 | 0 | 220 ms | 2.03 s | 2.54 s | **0%** | Executed ✅ |
| — | 25 → 500 VU stages | — | — | — | — | — | — | — | — | — | **Blocked** — see §5 |

\* Run 2b's 30 s timeouts did not reproduce (2c immediately after was clean) and sequential curls during the same window were 0.38–0.56 s — attributed to a transient local/edge stall; recorded honestly, not excluded.

**Interpretation:**
- When the edge serves normally, the homepage is **fast**: clean-run p95 **238 ms** at 5 VUs (target < 2 s ✅).
- The **Vercel Security Checkpoint** (403, `Server: Vercel`, live-attributed) engages above roughly **0.6–1 req/s sustained from one IP**: 44% challenge at ~1.1 rps, 100% at 1.4 rps. This is effective bot defense (DR-SEC-014) and the reason higher-VU stages are blocked for a single generator.
- The 19.3 s tail at stage 3 was server-side (`http_req_waiting` p95 19.3 s; local `blocked` only 3.2 s) and co-occurred with checkpoint activity.

## 4. Stage results — API (`api-public.js`, `track.js`)

| # | Scenario | VUs | Think | Requests | Failures | p50 | p95 | max | Status |
|---|---|---|---|---|---|---|---|---|---|
| A1 | api smoke (run 1) | 1 | 3 s | 3 | 1 (33%) network + slow | 1.27 s | **17.57 s** | 19.38 s | Executed ❌ |
| A2 | api smoke (run 2) | 1 | 3 s | 6 | 0% | 1.04 s | 2.0 s | 2.29 s | Executed ⚠️ borderline |
| A3 | api v5 | 5 | 5 s | 14 | **7.14%** | 0.69 s | **13.44 s** | 27.89 s | Executed ❌ stop |
| T1 | track smoke (synthetic) | 1 | 6 s | 3 | 1 unexpected (status unattributed — fixed post-run) | 1.58 s | **17.49 s** | 19.25 s | Executed ❌ |
| — | api 10+ VUs | — | — | — | — | — | — | — | **Not started** (stop condition met) |

**Interpretation:**
- The public API **fails the provisional targets at zero effective load**: median ≈ 0.7–1.3 s, p95 2–17.6 s, and at just 5 concurrent VUs a **7.1% failure rate with a 27.9 s outlier** — 7× the 1% failure target.
- This is origin-side (successful responses show server `waiting` time; no local bottleneck; sequential curl confirms 0.8–3.8 s at rest).
- Per owner direction, API escalation stopped at 5 VUs.
- The global limiter (1000 req/15 min/IP ≈ 1.1 rps, live-verified headers) would cap any single-IP API test regardless; no 429s were reached in our runs (budget respected via think time).

## 5. Ramp status vs. plan (final)

**Owner decision (2026-10-17):** documented-ceiling option selected. **No Vercel IP bypass/allowlist rules were or will be added, security settings were not weakened, and no application code was changed.** Stages beyond the measured ceiling were not run — reporting anything else would be fabrication.

| Planned stage | Homepage scenario | API scenario | Status label |
|---|---|---|---|
| smoke (1 VU/20 s) | Run, 0% fail | Run, borderline | **Executed** (§3–4) |
| 1 VU/30 s | Run, 0% fail | Run (2 variants) | **Executed** |
| 5 VU/30 s | Run ×3 (best clean run p95 238 ms; two runs degraded by checkpoint/transient stall) | Run, 7.1% fail → stop | **Executed** |
| 10 VU/1 min | Run ×2 → 37.5% fail at 8 s think; 100% blocked at 3 s think | Capped by owner (stop condition met at 5 VU) | **Executed — failed targets** |
| **25 VU** | Not run — would be ≥ ~95% checkpoint-blocked from one IP (measured 100% at 1.4 rps) | Not run (rate budget + instability) | **Blocked — checkpoint ceiling** |
| **50 VU** | Not run | Not run | **Not started — gated on 25 VU result** |
| **100 / 200 / 300 / 400 / 500 VU** | Not run | Not run | **Not started — gated on prior stage + per-stage owner approval** |

**Measured ceilings (this session, single generator):**
- **Frontend HTML:** meaningful measurement possible up to **~5 VUs / ~0.6 rps** sustained; degradation (challenges + server-side waits) begins at **~10 VUs / ~1 rps**; total block at **~1.4 rps**. When not challenged, performance comfortably meets targets (p95 238 ms clean run).
- **Public API:** meaningful measurement possible up to **1 VU reliably** (p95 2–17.6 s — already over target); at 5 VUs failures appear (7.1%). Architectural cap regardless: **1000 req/15 min/IP ≈ 1.1 rps** (live-verified headers, spoof-resistant).
- **No test at 25–500 VUs exists. A "successful 500-VU result" cannot be claimed and is not claimed anywhere in these deliverables.**

## 6. Baseline test-suite execution (Executed)

- `npm test` as written: **fails** (`node --test dist/test` → `MODULE_NOT_FOUND` on Node 22.20) — DR-SEC-016.
- `node --test dist/test/*.test.js`: **10/39 fail** — ambient `.env` (`OTP_ENABLED=true`) flips tested behavior (IDOR, role, race tests).
- With `OTP_ENABLED=false` pinned: **39/39 pass (129 s)** ✅ — baseline security regression suite is healthy when isolated from dev config.

## 7. Dependency scan (Executed)

- `droovee-api` prod deps: **0 vulnerabilities**.
- `droovee-web` prod deps: **2** (1 high, 1 moderate — postcss via next) → DR-SEC-015.

## 8. Bottlenecks and recommendations (priority order)

1. **API request path (critical):** p95 already 2–17 s at 1–5 VUs. Causes evidenced: (a) every public endpoint hits MongoDB with **no in-process cache** (`services/settings.ts:10-21`); (b) 3-hop cross-region chain (Vercel bom1 → Cloudflare → Render → DB) per request; (c) heavy tail suggests Render cold starts/instance cycling (unverifiable without server metrics). *Fixes:* cache active settings (TTL 30–60 s), co-locate API+DB with the edge or move API to Vercel functions, enable always-on instance / warm pings, then re-test.
2. **Rate-limit ceiling:** 1000/15 min/IP is right for auth surfaces but makes any single-IP API test (and any bursty legit client, e.g., a page firing 6+ API calls) exhaust its budget quickly. Consider raising the global backstop and relying on specific limiters; ensure keying survives proxy-chain changes (DR-SEC-013).
3. **Edge checkpoint vs. testing:** for any frontend work beyond ~10 VUs, use a **staging environment** or distributed/multi-IP generators as the primary approach. Note: this engagement deliberately did **not** add IP bypass rules or alter bot-protection settings (owner decision); any future protection tuning remains an explicit owner decision and was not exercised here.
4. **Frontend delivery:** healthy — p50 ~170–220 ms, ~215 kB JS + 44 kB CSS uncompressed; consider `next/image`/font and compression review later (not blocking).
5. **Generator limits:** single consumer laptop (4C/5.9 GB) — at 500 VUs, client CPU/bandwidth becomes part of the measurement; a distributed generator would be needed for authoritative capacity numbers.

## 9. Honest limitations

- A clean 500-VU run **has not been performed**; nothing here proves capacity beyond the executed stages.
- No server-side metrics (Vercel function duration, Render CPU/mem, Mongo pool) were available; bottleneck attribution uses client-side evidence only.
- Production was live during testing; real-user noise may affect samples; bursts were kept small and read-only.
- "Virtual users" ≠ real people: each VU here = 1 HTTP GET + 2–8 s think time; actual throughput per stage is in `http_reqs` (e.g., stage 2c: 10 reqs/30 s ≈ 0.33 rps; stage 3b: 90 reqs/60 s = 1.43 rps).
- Bot-challenge (403) responses are Vercel protections, not application errors; both raw and adjusted failure rates are reported.

## 10. Staged load-test plan: baseline → 500 VUs

**Status: PLAN ONLY — prepared, not executed.** No stage in this plan has been launched since the documented-ceiling decision. **No stage may start without the owner's individual, explicit approval.** No code, configuration, rate limit, or Vercel security setting is changed by this plan; no real booking/payment/OTP/email/SMS/login actions occur anywhere in it.

### 10.1 Two separated tracks

| Track | Environment | Purpose | What it may touch | Hard boundaries |
|---|---|---|---|---|
| **A — Production-safe validation** | `https://droovee.vercel.app` (live) | Confirm correctness/latency of the public read path before and after changes; guard regressions | Read-only public endpoints only, ≤ ~1 rps, single generator | No writes, no auth attempts, no bypasses; rate budget respected; checkpoint accepted as-is |
| **B — Staging capacity testing** | New staging environment (§11 prerequisites) | Measure capacity, bottlenecks, and limits up to **500 VUs** | Synthetic test accounts + synthetic data on staging only | Never touches production; production protections/rate limits never altered |

Track A can never reach meaningful 15–500 VU numbers (measured: 100% Vercel Security Checkpoint blocking at ~1.4 rps from one IP). **All stages ≥15 VUs are checkpoint-blocked on production by design and are therefore scheduled exclusively in Track B.** Bypassing or weakening that protection is out of scope permanently under this plan.

### 10.2 VU vs RPS (how this plan counts load)

- **VU (virtual user)** = one concurrent loop: send request(s) → think (idle) → repeat. A VU is **not** a person and not a rate.
- **RPS** = actual requests completed per second = `VUs ÷ (request latency + think time)`.
- Worked example: 500 VUs, 10 s think, 0.3 s latency → 500 ÷ 10.3 ≈ **48 RPS** — modest for a CDN, substantial for a single API instance.
- Because k6 scenarios here issue **1 request per iteration**, planned RPS ≈ the table below; multi-request journeys (§10.3) multiply request throughput per iteration.

### 10.3 Endpoints and user journeys

| ID | Journey | Endpoints (verified 2026-10-17) | Requests/iteration | Think time | Auth | Data effect |
|---|---|---|---|---|---|---|
| **J1** | Public browse | `GET /` (document) | 1 | 8 s (≤100 VU), 10 s (≥150 VU) | none | none (edge cache) |
| **J2** | Pricing research | weighted: `GET /api/v1/services` 45%, `GET /api/v1/pricing/estimate?serviceType=hourly&durationHours=3&startAt=2026-12-01T10:00:00Z` 25%, `GET /api/v1/ratings/recent` 20%, `GET /api/v1/health` 10% | 1 | 5 s | none | none (reads; synthetic fixed date) |
| **J3** | Track (synthetic) | `GET /api/v1/bookings/track?bookingNumber=DRV-T#######` — **expected 404** | 1 | 8 s | none | none (guaranteed non-existent records) |
| **J4** | Authenticated reads (staging only) | `GET /api/v1/auth/me`, `GET /api/v1/bookings/my`, `GET /api/v1/bookings/:id` on seeded synthetic bookings | 3 | 10 s | test accounts | none (reads) |
| **J5** | Writes (booking create/cancel, uploads) | — | — | — | — | **EXCLUDED from this plan**; requires a separate, later approval with the cleanup runbook in `SECURITY_TESTS.md` §3 |

Planned mix: stages 1–25 → J1 70% / J2 20% / J3 10%. Stages 50–500 → J1 50% / J2 30% / J3 10% / J4 10% (Track B only). J2/J3 count against per-IP budgets in Track A; Track B budgets depend on the owner's staging limiter decision (§11-P4).

### 10.4 Track A — production-safe validation ladder (live site)

| Stage | VUs | Duration | Think | Planned RPS | Status (measured) | Outcome |
|---|---|---|---|---|---|---|
| A0 baseline probes | 0 (sequential, ~30 req) | ~2 min | n/a | ≤0.5 | **Executed** (§2) | API 0.81–3.79 s; edge 0.33–0.56 s |
| A1 | 1 | 30 s + 30 s drain | 2–5 s | ~0.15–0.4 | **Executed** | ✅ 0% fail; p95 924 ms–2.03 s (small samples) |
| A5 | 5 | 30 s + 30 s drain | 8 s | ~0.6 | **Executed ×3** | ✅ best run p95 **238 ms**, 0% fail; one transient-degraded run (2×30 s timeouts, non-reproducing) |
| A10 | 10 | 60 s | 8 s / 3 s | ~1.1 / ~1.4 | **Executed ×2** | ❌ 37.5% fail + 19.3 s server-side wait (8 s think); **100% checkpoint-blocked** (3 s think) |
| A15, A20, A25 | 15–25 | — | — | ≥1.7 | **BLOCKED — Vercel Security Checkpoint** (single-IP; measured 100% block at 1.4 rps) | Not run; routed to Track B |
| A50 → A500 | 50–500 | — | — | ≥4.9 | **BLOCKED — Vercel Security Checkpoint** | Not run; routed to Track B |
| API-1 | 1 | 30 s | 3 s | ~0.5 | **Executed ×2** | ❌ p95 17.6 s (run 1) / 2.0 s (run 2) — over 2 s target at zero load |
| API-5 | 5 | 30 s | 5 s | ~1.5 | **Executed** | ❌ 7.14% failures, p95 13.4 s, max 27.9 s → stop condition met |
| API-10+ | ≥10 | — | — | — | **Not started** (stop condition + 1000/15 min/IP budget ≈ 1.1 rps cap) | Requires Track B or server metrics + owner decision |

Track A re-runs: only as **pre/post-change confirmation probes** (A0, A1, API-1, ≤30 requests each), each announced in advance. A0/A1/API-1 are the designated "did the fix help?" probes for after any future remediation.

### 10.5 Track B — staging capacity ladder (§11 prerequisites required)

Ramp shape per stage: linear ramp-up → hold → graceful drain (30 s, built into scripts). Recovery = observation + cool-down **before the next stage is requested**; if any journey used J2/J3 and staging mirrors production limits, recovery extends to **15 min** to reset rate windows.

| Stage | VUs | Ramp-up | Hold | Stage total | Recovery | Think | Planned RPS (J1 basis) | Journey mix | Approval |
|---|---|---|---|---|---|---|---|---|---|
| B0 | 0 (probes) | — | ~2 min | ~2 min | 60 s | — | ≤0.5 | baseline battery | Not requested |
| B1 | 1 | 10 s | 60 s | ~100 s | 60 s | 8 s | ~0.12 | 70/20/10 | **Not approved** |
| B5 | 5 | 15 s | 60 s | ~105 s | 60 s | 8 s | ~0.6 | 70/20/10 | **Not approved** |
| B10 | 10 | 20 s | 60 s | ~110 s | 60 s | 8 s | ~1.1 | 70/20/10 | **Not approved** |
| B15 | 15 | 20 s | 60 s | ~110 s | 90 s | 8 s | ~1.7 | 70/20/10 | **Not approved** |
| B20 | 20 | 20 s | 60 s | ~110 s | 90 s | 8 s | ~2.3 | 70/20/10 | **Not approved** |
| B25 | 25 | 30 s | 60 s | ~120 s | 90 s | 8 s | ~2.8 | 70/20/10 | **Not approved** |
| B50 | 50 | 30 s | 120 s | ~180 s | 120 s | 10 s | ~4.9 | 50/30/10/10 | **Not approved** |
| B75 | 75 | 30 s | 120 s | ~180 s | 120 s | 10 s | ~7.3 | 50/30/10/10 | **Not approved** |
| B100 | 100 | 30 s | 120 s | ~180 s | 120 s | 10 s | ~9.7 | 50/30/10/10 | **Not approved** |
| B150 | 150 | 60 s | 120 s | ~210 s | 180 s | 10 s | ~14.6 | 50/30/10/10 | **Not approved** |
| B200 | 200 | 60 s | 120 s | ~210 s | 180 s | 10 s | ~19.4 | 50/30/10/10 | **Not approved** |
| B300 | 300 | 60 s | 120 s | ~210 s | 180 s | 10 s | ~29.1 | 50/30/10/10 | **Not approved** |
| B400 | 400 | 120 s | 120 s | ~270 s | 300 s | 10 s | ~38.8 | 50/30/10/10 | **Not approved** |
| B500 | 500 | 120 s | 120 s | ~270 s | 300 s + debrief | 10 s | ~48.5 | 50/30/10/10 | **Not approved** |

Escalation rule: request **one stage at a time**, review its metrics (below) with the owner, apply the recovery period, then request the next. If a stage fails thresholds → stop escalation, diagnose, fix (later phase), re-run the **same** stage under comparable conditions.

Commands (existing presets run as-is; presets `v15`, `v20`, `v75`, `v150` **do not yet exist** — adding them is a test-script edit that will only be done on explicit approval):

```powershell
& $k6 run -e BASE_URL=<staging-url> -e RAMP=v25  load-tests\homepage.js
& $k6 run -e BASE_URL=<staging-url> -e RAMP=v50  -e THINK_MS=10000 load-tests\api-public.js
& $k6 run -e BASE_URL=<staging-url> -e RAMP=v500 load-tests\homepage.js
```

### 10.6 Metrics collected per stage

- **k6 (all stages):** VU count and duration actually achieved; `http_reqs` count and rate (**actual RPS**, never assumed); total bytes sent/received; latency avg/med/p90/**p95**/p99 overall and per endpoint tag (`homepage`, `api/services`, `api/estimate`, `api/ratings-recent`, `api/health`, `api/track`); HTTP failure rate; status-code distribution (per-status counters incl. `403`/`429`); check pass rate; iteration duration.
- **Track A only (client-observable):** `Ratelimit` header trend, checkpoint 403 share, `X-Vercel-Cache` share, `/health` continuity probes between stages.
- **Track B only (server-side, prerequisite P2):** API host CPU/memory, Node event-loop lag, request concurrency, MongoDB connection count vs pool size, slow-query log, error log rate; Vercel function duration/invocations for any SSR pages.
- **Generator:** CPU/RAM of the test host sampled during stages ≥150 (so client saturation is never mistaken for server saturation).

### 10.7 Pass/fail thresholds (provisional; tightened per endpoint once requirements are known)

| Metric | Homepage document (J1) | Public API (J2/J3) | Health | Authenticated reads (J4) |
|---|---|---|---|---|
| p95 latency | < 1500 ms | < 2000 ms | < 500 ms | < 2000 ms |
| HTTP failure rate | < 1% (403s excluded from origin rate, reported separately) | < 1% | 0% | < 1% |
| Check pass rate | 100% | ≥ 95% | 100% | ≥ 99% |
| 429 count | n/a | 0 unless the stage intentionally tests limiter behavior | 0 | 0 |
| Cross-stage stability | p95 ≤ 1.5 × previous stage; no new error class | same | same | same |

Stage passes only if **all** applicable thresholds hold for the full hold period; then recovery; then next-stage approval.

### 10.8 Stop conditions (any track — stop immediately, no further stages until owner decides)

1. HTTP failure rate > 1% over any 30 s window, or any 5xx cluster (≥3 in 30 s).
2. p95 > 2× the previous stage's p95 sustained through the hold period.
3. `/health` returns `degraded` twice consecutively (Track A) or staging API health check fails (Track B).
4. Track A: checkpoint 403 share > 20% (protection actively engaging — pause; never bypass).
5. Any 429 on endpoints with no documented limiter (unexpected limit → configuration question for the owner).
6. Track B server metrics: CPU > 80%, memory > 85%, Mongo connections > 80% of pool, event-loop lag > 100 ms sustained, disk > 90%.
7. Generator metrics: client CPU > 90% or free RAM < 500 MB (result would measure the laptop, not the server).
8. Any real-user impact signal (owner report), or any production state change observed.
9. Owner halt, at any moment, without justification required.

### 10.9 Data effects and cleanup

- **Track A (production):** read-only by construction — the request inventory in LOAD_TEST_PLAN §2 shows no state-changing calls; **cleanup: nothing created, nothing to delete.** Verified each run by the script's fixed endpoint set.
- **Track B read-only stages (this plan):** synthetic booking numbers guarantee 404s; J4 reads seeded records; test accounts are never mutated. **Cleanup: none;** verify at stage end with a one-line DB count spot-check (record counts unchanged).
- **J5 write phase (excluded):** would require the `SECURITY_TESTS.md` §3 runbook — synthetic markers (`DRV-T*`, test phone numbers), explicit cleanup commands, and pre-approved teardown — in a future, separately authorized phase only.

### 10.10 Required infrastructure summary

| Need | Track A | Track B |
|---|---|---|
| Environment | existing production | staging Vercel project + staging API + staging/synthetic DB (P1) |
| Monitoring | client-side only (existing) | **server-side dashboards/logs required** (P2) |
| Accounts | none | 2 customer + 1 support + 1 owner test accounts (P3) |
| Rate limits / bot protection | untouched | owner-decided staging values, documented (P4) — production never altered |
| Generator | this laptop (4C/5.9 GB) — adequate ≤ 10 VU | adequate ≤ ~150 VU single-journey; **≥8 GB RAM host or 2 generators for 500 VU mixed**; ≥20 Mbps uplink (P6) |
| Scripts | ready (`load-tests/`, validated via `k6 inspect`) | ready + 4 presets pending approval (§10.5) |
| People | none during probe runs | owner reachable during every stage (P7) |

---

## 11. Readiness checklist and exact prerequisites for testing toward 500 VUs

Nothing below exists implicitly — each item must be satisfied and confirmed before the corresponding stages may be requested. Owner items are marked **[owner]**, operator items **[operator]**.

**Prerequisites (all required before any Track B stage, and P1–P3 before anything beyond A5):**

- [ ] **P1 [owner] Staging environment exists:** separate URL (e.g., staging project on Vercel) with its own API deployment and its own database/DB name seeded with synthetic data — identical code version to production, **no production endpoints reachable** from it.
- [ ] **P2 [owner] Server-side observability:** read-only access to API-host metrics/logs (CPU, memory, event-loop, error log), MongoDB metrics (connections, query latency, pool saturation), and Vercel logs — without these, stages ≥50 are unsafe to interpret and will not be run.
- [ ] **P3 [owner] Test accounts:** two customer accounts (A, B), one `support` staff, one owner account, plus seeded synthetic bookings for A; credentials delivered out-of-band (never into the repo/scripts); OTP disabled or debug-only on staging.
- [ ] **P4 [owner] Staging rate-limit & bot-protection decision recorded:** values chosen for capacity measurement (e.g., non-binding limits on staging) and explicitly approved by the owner. **Production limits/protections remain exactly as-is — no bypass, no weakening, in either environment's production path.**
- [ ] **P5 [operator] Scripts validated:** `k6 inspect` passes for all scenario scripts after any edit; new ramp presets (`v15`, `v20`, `v75`, `v150`) added to `load-tests/lib/config.js` **only with approval**, then re-validated.
- [ ] **P6 [operator] Generator sized:** ≤150 VU single-journey OK on current host; for 500 VU mixed journeys provide a ≥8 GB RAM machine (or two generators) with ≥20 Mbps uplink; local resource sampling enabled per §10.8-7.
- [ ] **P7 [owner] Test window scheduled:** agreed off-peak hours (IST), duration booked, owner reachable as incident contact; real-user impact priority over test continuity.
- [ ] **P8 [owner+operator] Approval protocol accepted:** each stage requested individually in writing before launch; **no auto-progression, no unattended ramps**; this document updated with results only after stages actually run.
- [ ] **P9 [operator] Monitoring ready before each stage:** dashboards open (Track B), health probes queued (Track A), stop conditions from §10.8 reviewed for that stage.
- [ ] **P10 [operator] Cleanup stance confirmed:** default plan is 100% read-only (zero cleanup); any future write phase requires its own approval using `SECURITY_TESTS.md` §3.
- [ ] **P11 [operator] Baseline captured:** Track A probes (A0/A1/API-1) recorded for the code version under test, so Track B numbers have a comparable reference.
- [ ] **P12 [owner+operator] Definition of done:** ladder completed through B500 with all thresholds green **or** each failed stage yielding a documented bottleneck + owner decision; results appended to §3–§5 of this report with honest status labels.

**Stage-advance rule (recap):** A0–A10 executed; A15+ and all B-stages blocked/pending as marked; every future stage = owner approves that stage → run → record → review → recovery → request next. Until an individual approval arrives, **no stage launches.**

**Immediate next safe actions (no approval needed to *consider*, approval needed to *run*):** (1) owner works through P1–P4; (2) operator stands by to re-run A0/A1/API-1 probes after any remediation; (3) on owner request, add the four missing ramp presets (test-script-only edit) and re-validate scripts offline.
