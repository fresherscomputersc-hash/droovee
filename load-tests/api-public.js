// Scenario 2: Read-only API endpoints (no writes).
//
// Pricing is private now: /api/v1/services and /api/v1/pricing/estimate require
// a signed-in customer/staff access token. Pass one with -e ACCESS_TOKEN=...
// Without it those requests return 401 and are counted, not treated as outages.
//
// IMPORTANT rate-limit context (verified live 2026-10-17):
//   - All /api/v1/* routes sit behind a global limiter of 1000 requests /
//     15 min / client-IP bucket (Ratelimit draft-7 headers are returned).
//   - /pricing/estimate and /bookings/track share a tighter 120/15 min
//     per-IP limiter.
//   - /health is registered BEFORE the global limiter (unlimited).
// A single test generator therefore saturates the global bucket at ~1.1 rps.
// Keep THINK_MS high (>= 3000) and watch the Ratelimit-Remaining trend;
// 429 responses are an expected ceiling marker, not necessarily an outage.
//
// Run:
//   k6 run -e RAMP=smoke load-tests/api-public.js
//   k6 run -e RAMP=v10 -e THINK_MS=5000 -e ACCESS_TOKEN="<jwt>" load-tests/api-public.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import { BASE_URL, THINK_MS, FAILED_TOL, defaultOptions } from "./lib/config.js";

// Per-status counters: separates origin results from rate-limiter (429) and
// edge-protection (403) outcomes in the summary.
const statusCounter = new Counter("api_status");
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || "";
const AUTH_HEADERS = ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {};

export const options = defaultOptions({
  // The estimate endpoint has its own 120/15m limiter; failures here are
  // expected under sustained load from one IP. Reported, not gated.
  checks: ["rate>0.99"],
  "api_status{status:200}": ["count>=0"],
  "api_status{status:429}": ["count>=0"],
  "api_status{status:403}": ["count>=0"],
  "api_status{status:401}": ["count>=0"],
});

const START_AT = "2026-12-01T10:00:00Z"; // fixed synthetic future date
const ESTIMATE_QS =
  "serviceType=hourly&durationHours=3&startAt=" + encodeURIComponent(START_AT);

export default function () {
  // Weighted mix approximating real public traffic:
  //  45% services, 25% estimate, 20% ratings, 10% health.
  const roll = __VU * 1000 + __ITER; // deterministic spread
  const r = roll % 100;

  let res, name;
  if (r < 45) {
    name = "api/services";
    res = http.get(BASE_URL + "/api/v1/services", { headers: AUTH_HEADERS, tags: { name }, timeout: "30s" });
    check(res, {
      "services 200 or 401": (x) => x.status === 200 || x.status === 401,
      "services payload has rates when 200": (x) =>
        x.status !== 200 || (x.body.includes('"rates"') && x.body.includes('"settingsVersion"')),
    });
  } else if (r < 70) {
    name = "api/estimate";
    res = http.get(BASE_URL + "/api/v1/pricing/estimate?" + ESTIMATE_QS, {
      headers: AUTH_HEADERS,
      tags: { name },
      timeout: "30s",
    });
    check(res, {
      "estimate 200, 401 or 429": (x) => x.status === 200 || x.status === 401 || x.status === 429,
      "estimate total present when 200": (x) => x.status !== 200 || x.json("total") !== undefined,
    });
  } else if (r < 90) {
    name = "api/ratings-recent";
    res = http.get(BASE_URL + "/api/v1/ratings/recent", { tags: { name }, timeout: "30s" });
    check(res, { "ratings 200": (x) => x.status === 200 });
  } else {
    name = "api/health";
    res = http.get(BASE_URL + "/api/v1/health", { tags: { name }, timeout: "30s" });
    check(res, { "health 200": (x) => x.status === 200, "db up": (x) => x.json("db") === "up" });
  }

  statusCounter.add(1, { status: String(res.status) });
  sleep(THINK_MS / 1000);
}
