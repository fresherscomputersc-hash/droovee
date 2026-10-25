// Scenario 1: Homepage (public, read-only, served by Vercel edge/CDN).
// Measures document delivery latency. Static assets are intentionally NOT
// fetched per-VU to avoid unnecessary CDN traffic; asset timings were
// sampled once separately (see PERFORMANCE_REPORT.md).
//
// Run:
//   k6 run load-tests/homepage.js
//   k6 run -e RAMP=v25 load-tests/homepage.js
//   k6 run -e BASE_URL=http://localhost:3000 -e RAMP=smoke load-tests/homepage.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import { BASE_URL, THINK_MS, BROWSER_HEADERS, defaultOptions } from "./lib/config.js";

// Per-status counters. The Cloudflare edge intermittently returns 403 challenge
// pages to sustained single-IP automation (observed 2026-10-17); these
// submetrics separate origin results from edge-protection blocks.
const statusCounter = new Counter("homepage_status");

export const options = defaultOptions({
  "homepage_status{status:200}": ["count>=0"],
  "homepage_status{status:403}": ["count>=0"],
});

export default function () {
  const res = http.get(BASE_URL + "/", {
    tags: { name: "homepage" },
    timeout: "30s",
    headers: BROWSER_HEADERS,
  });
  statusCounter.add(1, { status: String(res.status) });
  check(res, {
    "homepage status 200": (r) => r.status === 200,
    "homepage is HTML": (r) => String(r.headers["Content-Type"] || "").includes("text/html"),
  });
  sleep(THINK_MS / 1000);
}
