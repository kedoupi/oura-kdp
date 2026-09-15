import type { Env } from "../env";
import {
  jsonError,
  oauthConfigured,
  resolveEncryptionKey,
  resolveSessionSecret,
} from "../lib/config";
import { clampDays, dateWindow, loadDevDaily, mapOuraToDaily } from "../lib/daily";
import {
  fetchDailySummaries,
  refreshAccessToken,
} from "../lib/oura";
import { readSessionFromRequest } from "../lib/session";
import {
  loadEncryptedTokens,
  tokensFromOura,
  upsertEncryptedTokens,
} from "../lib/tokens";

/** GET /api/me/daily?days=7|30|90 — session-gated nested daily (live board shape). */
export async function handleMeDaily(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const days = clampDays(Number(url.searchParams.get("days") ?? "30"));

  const secret = resolveSessionSecret(request, env);
  if (!secret) {
    return jsonError("SESSION_SECRET not configured", 503);
  }

  const session = await readSessionFromRequest(request, env, secret);
  if (!session) {
    return jsonError("unauthorized", 401, {
      hint: "Login with Oura, or GET /api/auth/dev/session on localhost",
    });
  }

  const headers = {
    "Cache-Control": "no-store",
  };

  if (session.kind === "dev") {
    return Response.json(await loadDevDaily(days), { headers });
  }

  const encKey = resolveEncryptionKey(request, env);
  if (!encKey) {
    return jsonError("TOKEN_ENCRYPTION_KEY not configured", 503);
  }
  if (!oauthConfigured(env)) {
    return jsonError("Oura OAuth secrets not configured", 503, {
      hint: "Set OURA_CLIENT_ID and OURA_CLIENT_SECRET",
    });
  }

  let stored = await loadEncryptedTokens(env, session.user_id, encKey);
  if (!stored) {
    return jsonError("no_stored_refresh_token", 401, {
      hint: "Reconnect Oura",
    });
  }

  if (!stored.access_token || stored.expires_at <= Date.now()) {
    const refreshed = await refreshAccessToken({
      refreshToken: stored.refresh_token,
      clientId: env.OURA_CLIENT_ID!,
      clientSecret: env.OURA_CLIENT_SECRET!,
    });
    stored = tokensFromOura(refreshed);
    await upsertEncryptedTokens(env, session.user_id, encKey, stored);
  }

  const { startDate, endDate, dates } = dateWindow(days);
  const raw = await fetchDailySummaries({
    accessToken: stored.access_token,
    startDate,
    endDate,
  });
  const body = mapOuraToDaily({
    dates,
    sleep: raw.sleep,
    readiness: raw.readiness,
    activity: raw.activity,
  });
  return Response.json({ ...body, user_id: session.user_id }, { headers });
}
