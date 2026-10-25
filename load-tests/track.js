// Scenario 3: Public booking tracking with SYNTHETIC booking numbers only.
// Every request is expected to return 404 (no real bookings are queried and
// no real phone numbers are ever sent). This exercises the same code path
// (MongoDB lookup + customerView serialization) as real tracking.
//
// Rate-limit context: /bookings/track shares the tight 120/15 min per-IP
// estimate limiter. Keep stages small; 429s mark the ceiling.
//
// Run:
//   k6 run -e RAMP=smoke load-tests/track.js

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, THINK_MS, defaultOptions } from "./lib/config.js";

export const options = defaultOptions({
  // 404 is the correct answer for synthetic numbers; only 5xx or 429 here
  // indicate capacity problems. Global p95 threshold also applies.
  "http_req_duration{name:api/track}": ["p(95)<2000"],
});

export default function () {
  // Synthetic, guaranteed-nonexistent booking number (DRV-XXXXXXXX format).
  const bn = "DRV-T" + String((__VU * 7919 + __ITER * 104729) % 100000000).padStart(7, "0");
  const res = http.get(BASE_URL + "/api/v1/bookings/track?bookingNumber=" + bn, {
    tags: { name: "api/track" },
    timeout: "30s",
    // 404/429 are the correct outcomes for synthetic numbers; only 5xx counts
    // as a failure for this scenario.
    responseCallback: http.expectedStatuses(404, 429),
  });
  check(res, {
    "track 404 (synthetic miss) or 429 (limiter)": (r) => r.status === 404 || r.status === 429,
    "track never 5xx": (r) => r.status < 500,
  });
  sleep(Math.max(THINK_MS, 5000) / 1000);
}
