import {
  OAUTH_STATE_TTL_SECONDS,
  SESSION_TTL_SECONDS,
  type Env,
} from "../env";
import { clearSessionCookieHeader, isSecureRequest, sessionCookieHeader } from "../lib/cookies";
import { randomHex } from "../lib/crypto";
import { frontendRedirect, json, missingSecrets, SETUP_HINT } from "../lib/http";
import {
  DEFAULT_SCOPES,
  exchangeCodeForTokens,
  fetchPersonalInfo,
  OURA_AUTH_URL,
} from "../lib/oura";
import {
  createSession,
  destroySession,
  saveTokenBundle,
  tokensToBundle,
} from "../lib/session";

function redirectUri(request: Request, env: Env): string {
  return env.OURA_REDIRECT_URI?.trim() || `${new URL(request.url).origin}/api/auth/oura/callback`;
}

/** GET /api/auth/oura/start — persist CSRF state, redirect to Oura authorize. */
export async function handleOuraStart(
  request: Request,
  env: Env,
): Promise<Response> {
  const clientId = env.OURA_CLIENT_ID?.trim();
  if (!clientId) {
    return json(
      {
        error: "OURA_CLIENT_ID not configured",
        hint: SETUP_HINT,
        setup: {
          developer_portal: "https://cloud.ouraring.com/oauth/applications",
          local_file: "workers/api/.dev.vars (copy from .dev.vars.example)",
          production: "wrangler secret put OURA_CLIENT_ID / OURA_CLIENT_SECRET / TOKEN_ENCRYPTION_KEY / SESSION_SECRET",
          scopes: DEFAULT_SCOPES,
        },
      },
      503,
    );
  }

  const state = randomHex(32);

  try {
    await env.DB.prepare(
      "DELETE FROM oauth_states WHERE expires_at < datetime('now')",
    ).run();
    await env.DB.prepare(
      `INSERT INTO oauth_states (state, expires_at)
       VALUES (?, datetime('now', '+${OAUTH_STATE_TTL_SECONDS} seconds'))`,
    )
      .bind(state)
      .run();
  } catch (err) {
    return json(
      {
        error: "failed to store oauth state",
        hint: "Apply D1 migrations: pnpm db:migrate:local (or wrangler d1 migrations apply oura_kdp --local / --remote)",
        detail: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }

  const auth = new URL(OURA_AUTH_URL);
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri(request, env));
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", DEFAULT_SCOPES);
  auth.searchParams.set("state", state);

  return Response.redirect(auth.toString(), 302);
}

/** GET /api/auth/oura/callback — verify state, exchange code, persist tokens, set session. */
export async function handleOuraCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return frontendRedirect(request, env, { error: err });
  }
  if (!code || !state) {
    return frontendRedirect(request, env, { error: "missing_code_or_state" });
  }

  const missing = missingSecrets(env, [
    "OURA_CLIENT_ID",
    "OURA_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY",
    "SESSION_SECRET",
  ]);
  if (missing.length > 0) {
    return json(
      {
        error: "oauth_not_configured",
        missing,
        hint: SETUP_HINT,
      },
      503,
    );
  }

  const stored = await env.DB.prepare(
    "SELECT state FROM oauth_states WHERE state = ? AND expires_at > datetime('now')",
  )
    .bind(state)
    .first<{ state: string }>();

  await env.DB.prepare("DELETE FROM oauth_states WHERE state = ?").bind(state).run();

  if (!stored) {
    return frontendRedirect(request, env, { error: "invalid_state" });
  }

  const uri = redirectUri(request, env);

  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      clientId: env.OURA_CLIENT_ID!,
      clientSecret: env.OURA_CLIENT_SECRET!,
      redirectUri: uri,
    });
  } catch (cause) {
    return frontendRedirect(request, env, {
      error: "token_exchange_failed",
      detail: cause instanceof Error ? cause.message : "exchange_failed",
    });
  }

  let profile;
  try {
    profile = await fetchPersonalInfo(tokens.access_token);
  } catch (cause) {
    return frontendRedirect(request, env, {
      error: "profile_failed",
      detail: cause instanceof Error ? cause.message : "profile_failed",
    });
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE oura_user_id = ?",
  )
    .bind(profile.id)
    .first<{ id: string }>();

  const userId = existing?.id ?? crypto.randomUUID();
  const email = profile.email ?? null;

  if (existing) {
    await env.DB.prepare(
      "UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?",
    )
      .bind(email, userId)
      .run();
  } else {
    await env.DB.prepare(
      "INSERT INTO users (id, email, oura_user_id) VALUES (?, ?, ?)",
    )
      .bind(userId, email, profile.id)
      .run();
  }

  await saveTokenBundle(env, userId, tokensToBundle(tokens));
  const cookieValue = await createSession(env, userId);

  const redirect = frontendRedirect(request, env, { logged_in: "1" });
  const headers = new Headers(redirect.headers);
  headers.append(
    "Set-Cookie",
    sessionCookieHeader(cookieValue, {
      maxAge: SESSION_TTL_SECONDS,
      secure: isSecureRequest(request),
    }),
  );
  return new Response(redirect.body, { status: redirect.status, headers });
}

/** POST|GET /api/auth/logout — drop session row and clear cookie. */
export async function handleLogout(
  request: Request,
  env: Env,
): Promise<Response> {
  await destroySession(request, env);
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": clearSessionCookieHeader(isSecureRequest(request)),
    },
  );
}
