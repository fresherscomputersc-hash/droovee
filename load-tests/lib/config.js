// Shared configuration for all Droovee k6 scenarios.
// No secrets here. Override via environment variables.
//
//   BASE_URL   Target base URL (default: production site)
//   RAMP       Named ramp preset: smoke | v1 | v5 | v10 | v25 | v50 | v100 | v200 | v300 | v400 | v500
//   THINK_MS   Per-iteration think time in ms (models a human; also keeps us
//              inside the API's per-IP rate-limit budget)
//   FAILED_TOL Maximum tolerated HTTP failure rate (default 0.01 = 1%)

export const BASE_URL = __ENV.BASE_URL || "https://droovee.vercel.app";
export const THINK_MS = Number(__ENV.THINK_MS ?? 3000);
export const FAILED_TOL = Number(__ENV.FAILED_TOL ?? 0.01);
export const P95_MS = Number(__ENV.P95_MS ?? 2000);

// Realistic browser headers. The site's edge protection (Vercel Security
// Checkpoint) returns 403 challenge pages to sustained automated HTML
// requests from a single IP (verified 2026-10-17); modeling real users
// requires browser-like headers. See SECURITY_AUDIT.md DR-SEC-014.
export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
};

// Ramp presets. Stages ramp to `target` then hold for `duration`.
// Escalation beyond v25 requires explicit owner approval (see LOAD_TEST_PLAN.md).
const RAMPS = {
  smoke: [{ duration: "20s", target: 1 }],
  v1: [{ duration: "30s", target: 1 }],
  v5: [{ duration: "30s", target: 5 }],
  v10: [{ duration: "1m", target: 10 }],
  v25: [{ duration: "1m", target: 25 }],
  v50: [{ duration: "2m", target: 50 }],
  v100: [{ duration: "2m", target: 100 }],
  v200: [{ duration: "2m", target: 200 }],
  v300: [{ duration: "2m", target: 300 }],
  v400: [{ duration: "2m", target: 400 }],
  v500: [{ duration: "2m", target: 500 }],
};

export const RAMP_NAME = __ENV.RAMP || "smoke";
export const ramp = RAMPS[RAMP_NAME] || RAMPS.smoke;

export function defaultOptions(extra = {}) {
  return {
    scenarios: {
      ramped: {
        executor: "ramping-vus",
        stages: ramp,
        gracefulRampDown: "30s",
      },
    },
    thresholds: {
      http_req_failed: ["rate<" + FAILED_TOL],
      http_req_duration: ["p(95)<" + P95_MS],
      ...extra,
    },
  };
}
