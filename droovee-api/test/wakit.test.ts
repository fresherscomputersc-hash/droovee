import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../src/lib/errors";
import { sendWakitOtp, verifyWakitOtp } from "../src/services/wakit";

const realFetch = globalThis.fetch;
const envKeys = ["WAKIT_API_KEY", "WAKIT_BASE_URL", "WAKIT_TIMEOUT_MS", "OTP_TTL_MINUTES"] as const;
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.WAKIT_API_KEY = "wk_test_unit";
  process.env.WAKIT_BASE_URL = "https://wakit.test/api/v1";
  process.env.OTP_TTL_MINUTES = "5";
  delete process.env.WAKIT_TIMEOUT_MS;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of envKeys) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("sendWakitOtp posts the phone and returns the Wakit message id", async () => {
  let captured: { url: string; init: RequestInit } | undefined;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    captured = { url: String(url), init: init ?? {} };
    return jsonResponse(
      {
        success: true,
        data: {
          id: "otp-123",
          status: "sent",
          channel: "whatsapp",
          expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        },
      },
      201,
    );
  }) as typeof fetch;

  const sent = await sendWakitOtp("+919876543210");

  assert.equal(captured?.url, "https://wakit.test/api/v1/otp/send");
  assert.equal((captured?.init.headers as Record<string, string>).Authorization, "Bearer wk_test_unit");
  assert.deepEqual(JSON.parse(String(captured?.init.body)), { to: "+919876543210", code_length: 6 });
  assert.equal(sent.id, "otp-123");
  assert.ok(sent.expiresAt.getTime() > Date.now());
});

test("verifyWakitOtp sends the id and code and returns the verified flag", async () => {
  const bodies: unknown[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return jsonResponse({ success: true, data: { verified: true, status: "verified" } });
  }) as typeof fetch;

  assert.equal(await verifyWakitOtp("otp-123", "123456"), true);
  assert.deepEqual(bodies[0], { id: "otp-123", code: "123456" });
});

test("verifyWakitOtp returns false for a wrong code", async () => {
  globalThis.fetch = (async () =>
    jsonResponse({ success: true, data: { verified: false, status: "failed" } })) as typeof fetch;

  assert.equal(await verifyWakitOtp("otp-123", "000000"), false);
});

test("Wakit balance errors become a safe internal error", async () => {
  globalThis.fetch = (async () =>
    jsonResponse({ success: false, error: { type: "insufficient_balance" } }, 402)) as typeof fetch;

  await assert.rejects(
    () => sendWakitOtp("+919876543210"),
    (err: unknown) =>
      err instanceof AppError &&
      err.status === 500 &&
      err.message === "WhatsApp OTP is temporarily unavailable. Try again later.",
  );
});

test("a missing Wakit key fails before any network call", async () => {
  delete process.env.WAKIT_API_KEY;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return jsonResponse({});
  }) as typeof fetch;

  await assert.rejects(
    () => sendWakitOtp("+919876543210"),
    (err: unknown) => err instanceof AppError && err.status === 500 && err.message === "WhatsApp OTP is not configured.",
  );
  assert.equal(called, false);
});
