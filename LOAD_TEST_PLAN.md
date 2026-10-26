# Droovee — Load Test Plan

**Target:** https://droovee.vercel.app/ (production, authorized by owner) — Vercel edge + Render API + MongoDB.
**Tool:** Grafana k6 v2.3.0 (Windows binary), single test generator.
**Plan date:** 2026-10-17. Status of execution is tracked in `PERFORMANCE_REPORT.md`.

---

## 1. Architecture and request path

```
Browser / k6 (single Windows host, India)
   │ HTTPS
   ▼
Vercel edge (bom1, Mumbai)  — serves prerendered HTML + /_next/static assets; CDN cache
   │  WAF/bot layer: "Vercel Security Checkpoint" 403 on sustained automation (live-attributed: Server: Vercel)
   │ rewrite /api/v1/* (server-side)
   ▼
Cloudflare  — present in path (Cf-Ray on normal responses); did NOT challenge API JSON during our runs
   │
   ▼
Render (Express 5 API, region not disclosed)  — global rate limiter 1000/15min/IP; auth 30/15min/IP
   │
   ▼
MongoDB (Atlas or Render-hosted, replica set) — every public API request queries DB (no in-process cache)
```

## 2. Endpoint inventory (verified live 2026-10-17)

| # | Endpoint | Method | Auth | Limits (per IP) | Used in load test | Data effect |
|---|---|---|---|---|---|---|
| 1 | `/` | GET | none | none (Cloudflare bot rules) | Yes — primary frontend scenario | none (cached) |
| 2 | `/api/v1/health` | GET | none | **none** (registered before global limiter) | Yes — 10% share | none (DB ping) |
| 3 | `/api/v1/services` | GET | customer/staff Bearer | global 1000/15min | Yes — 45% share (pass `ACCESS_TOKEN`) | none (reads settings) |
| 4 | `/api/v1/pricing/estimate` | GET | customer/staff Bearer | estimate 120/15min | Yes — 25% share (pass `ACCESS_TOKEN`) | none (computes fare) |
| 5 | `/api/v1/ratings/recent` | GET | none | global | Yes — 20% share | none |
| 6 | `/api/v1/bookings/track` | GET | none | estimate 120/15min | Yes — synthetic numbers only, expected 404 | none |
| 7 | `/api/v1/bookings/my`, `/admin/*`, `/driver/j/:token/*` | GET/POST | Bearer/session | layered | **No** — requires credentials; safe validation only | n/a |

**Expected status codes:** 200 for 1–5; 404 for synthetic track; 401 for protected endpoints without credentials; 429 when a limiter bucket exhausts; 403 = Cloudflare challenge (edge protection, not app error).

## 3. Safety rules (owner-approved constraints)

- Read-only traffic only. **No booking creation, no payments, no emails/SMS/OTP triggers, no login attempts, no real phone numbers or customer data.**
- Synthetic tracking numbers only (`DRV-T#######`), all guaranteed non-existent.
- Single controlled test generator; browser-like headers (the Vercel Security Checkpoint challenges automated requests — see DR-SEC-014).
- Escalation: smoke → 1 → 5 → 10 → 25 (owner pre-approved), **50+ only with explicit owner approval per stage**, ultimately 500 VUs.
- Stop conditions: error rate rising, latency spikes, hosting protections activating, real users affected, backend/DB metrics unavailable → interpret conservatively and stop on distress signals.
- No production configuration changes, no deployments, no credential rotation.

## 4. Scenarios and ramp stages

Scripts in `load-tests/` (env-configurable via `BASE_URL`, `RAMP`, `THINK_MS`):

1. **`homepage.js`** — GET `/`, checks 200 + HTML, per-status counters (200/403). Thresholds: `p95 < 2000 ms`, failure rate `< 1%`.
2. **`api-public.js`** — weighted read-only mix of endpoints 2–5 with ≥3 s think time. Thresholds: p95 < 2 s, checks > 99%, per-status counters (200/429/403).
3. **`track.js`** — endpoint 6 with synthetic numbers; 404/429 treated as expected outcomes via `responseCallback`, 5xx = failure.

Ramp presets (config.js): `smoke` (1 VU/20s), `v1`, `v5`, `v10`, `v25`, `v50`, `v100`, `v200`, `v300`, `v400`, `v500` — increasing durations 30 s → 2 min per owner instruction, with `gracefulRampDown: 30s`.

### Rate-budget arithmetic (why API stages are capped)

- Global API bucket: 1000 req/15 min/client IP ≈ **1.1 req/s sustained**.
- `estimate`/`track` bucket: 120/15 min ≈ 0.13 req/s.
- With N VUs and think time T, request rate ≈ N/(T + latency). Even 25 VUs at 5 s think ≈ 4–5 rps → exhausts the global bucket within minutes, so API stages must stay small and spaced, or the ceiling itself becomes the documented result.
- Frontend (Vercel/Cloudflare) has no numeric request limit, but sustained single-IP HTML automation triggers **403 challenges** after a low threshold (measured: >~1 req/s sustained produced 44–100% challenge rates).

## 5. Assumptions

- Test generator: single Windows 11 host (consumer broadband, India), k6 v2.3.0. Client-side network is part of every measurement.
- Production is the only available environment (no staging). Real-user traffic may add noise; tests were run in short bursts to limit impact.
- Acceptance targets (provisional): p95 < 2 s ordinary endpoints, HTTP failure rate < 1%, ≥ 95% checks passing.

## 6. Monitoring and stop conditions

| Signal | Source available? | Action |
|---|---|---|
| k6 latency/error/status distribution | Yes (recorded) | Review after every stage |
| `Ratelimit` header trend | Yes (client-visible) | Stop API escalation when 429s appear |
| Cloudflare 403 challenge rate | Yes (client-visible) | Treat as edge protection; pause and let reputation decay |
| Vercel dashboard (function duration, limits) | **No access** | Limitation — client-side proxies only |
| Render CPU/memory/restarts | **No access** | Limitation — stop escalation on 5xx/timeouts |
| MongoDB connections/query latency | **No access** | Limitation — infer from API latency tails |

**Stop immediately if:** 5xx rate rises above ~1%, latency p95 exceeds ~5 s sustained at low VUs (already observed — see report), Cloudflare blocking becomes persistent, or owner requests a halt.

## 7. Explicitly NOT tested under load

Write endpoints, authentication endpoints, OTP endpoints, admin endpoints, file uploads, multi-region generators, and real-browser journeys (Playwright) — recommended as a follow-up with a staging environment and multi-IP generators.

---

## 8. Outcome (final)

Ramp stopped at **10 VUs (frontend)** and **5 VUs (API)** under the owner's documented-ceiling decision (2026-10-17): no IP bypass rules, no security weakening, no code changes. Stages 25–500 were **not run**. Full results, status labels, and safe next steps: `PERFORMANCE_REPORT.md` §5 and §10.
