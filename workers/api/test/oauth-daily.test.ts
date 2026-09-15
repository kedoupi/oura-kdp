import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowDevLogin,
  DEV_PLACEHOLDER_CLIENT_ID,
  resolveClientId,
} from "../src/lib/config.ts";
import { decryptJson, encryptJson, hmacSign, hmacVerify } from "../src/lib/crypto.ts";
import { clampDays, dateWindow, mapOuraToDaily } from "../src/lib/daily.ts";
import { buildDevDaily } from "../src/lib/mock.ts";
import { buildAuthorizeUrl, DEFAULT_SCOPES, OURA_AUTH_URL } from "../src/lib/oura.ts";

function fakeEnv(overrides: Record<string, string | undefined> = {}) {
  return overrides as import("../src/env.ts").Env;
}

function req(host: string): Request {
  return new Request(`http://${host}/api/auth/oura/start`);
}

describe("Oura authorize URL", () => {
  it("matches cloud.ouraring.com/oauth/authorize shape", () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: DEV_PLACEHOLDER_CLIENT_ID,
        redirectUri: "http://localhost:5173/api/auth/oura/callback",
        state: "csrf-state-1",
      }),
    );
    assert.equal(url.origin + url.pathname, OURA_AUTH_URL);
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("client_id"), DEV_PLACEHOLDER_CLIENT_ID);
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "http://localhost:5173/api/auth/oura/callback",
    );
    assert.equal(url.searchParams.get("scope"), DEFAULT_SCOPES);
    assert.equal(url.searchParams.get("state"), "csrf-state-1");
  });
});

describe("DEV vs production client id", () => {
  it("uses placeholder on localhost when secret is missing", () => {
    assert.equal(
      resolveClientId(req("localhost"), fakeEnv()),
      DEV_PLACEHOLDER_CLIENT_ID,
    );
    assert.equal(allowDevLogin(req("localhost"), fakeEnv()), true);
  });

  it("uses real client id when configured", () => {
    assert.equal(
      resolveClientId(req("oura.kdp.cool"), fakeEnv({ OURA_CLIENT_ID: "real_app" })),
      "real_app",
    );
  });

  it("fails closed on production host without client id", () => {
    assert.equal(resolveClientId(req("oura.kdp.cool"), fakeEnv()), null);
    assert.equal(allowDevLogin(req("oura.kdp.cool"), fakeEnv()), false);
  });
});

describe("AES-GCM token envelope", () => {
  it("round-trips refresh_token and never equals plaintext", async () => {
    const secret = "dev-only-token-encryption-key-not-for-prod";
    const payload = { refresh_token: "rt_secret", access_token: "at_secret", expires_at: 1 };
    const blob = await encryptJson(secret, payload);
    assert.ok(!blob.ciphertext.includes("rt_secret"));
    assert.notEqual(blob.iv, blob.ciphertext);
    const out = await decryptJson<typeof payload>(secret, blob);
    assert.deepEqual(out, payload);
  });

  it("HMAC verifies session ids", async () => {
    const sig = await hmacSign("session-secret", "sid-1");
    assert.equal(await hmacVerify("session-secret", "sid-1", sig), true);
    assert.equal(await hmacVerify("session-secret", "sid-2", sig), false);
  });
});

describe("daily series", () => {
  it("maps Oura documents onto a stable chart shape", () => {
    const { dates } = dateWindow(7, new Date("2026-09-15T12:00:00Z"));
    const body = mapOuraToDaily({
      days: 7,
      dates,
      sleep: [{ day: dates[0]!, score: 88 }],
      readiness: [{ day: dates[0]!, score: 77 }],
      activity: [{ day: dates[0]!, score: 66 }],
    });
    assert.equal(body.source, "oura");
    assert.equal(body.series.length, 7);
    assert.equal(body.series[0]?.sleep, 88);
    assert.equal(body.summary.sleep, 88);
    assert.equal(body.stub, undefined);
  });

  it("DEV series is labeled and realistic", () => {
    const body = buildDevDaily(30);
    assert.equal(body.source, "dev");
    assert.equal(body.dev, true);
    assert.equal(body.series.length, 30);
    assert.match(body.label ?? "", /DEV/);
    assert.ok(body.summary.sleep > 40);
  });

  it("clamps days to 7|30|90", () => {
    assert.equal(clampDays(7), 7);
    assert.equal(clampDays(90), 90);
    assert.equal(clampDays(12), 30);
  });
});
