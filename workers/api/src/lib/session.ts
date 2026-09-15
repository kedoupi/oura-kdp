import {
  ACCESS_TOKEN_REFRESH_SKEW_MS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type Env,
} from "../env";
import { decryptJson, encryptJson, hmacHex, timingSafeEqual } from "./crypto";
import { parseCookies } from "./cookies";
import { refreshAccessToken, type OuraTokens } from "./oura";

export type SessionUser = {
  id: string;
  email: string | null;
  oura_user_id: string | null;
};

export type TokenBundle = {
  refresh_token: string;
  access_token: string;
  expires_at: number;
};

export async function signSessionId(
  sessionId: string,
  secret: string,
): Promise<string> {
  const sig = await hmacHex(secret, sessionId);
  return `${sessionId}.${sig}`;
}

export async function readSignedSessionId(
  cookieValue: string | undefined,
  secret: string,
): Promise<string | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = await hmacHex(secret, id);
  if (!timingSafeEqual(sig, expected)) return null;
  return id;
}

export async function getSessionUser(
  request: Request,
  env: Env,
): Promise<SessionUser | null> {
  if (!env.SESSION_SECRET) return null;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionId = await readSignedSessionId(
    cookies[SESSION_COOKIE],
    env.SESSION_SECRET,
  );
  if (!sessionId) return null;

  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, u.id, u.email, u.oura_user_id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  )
    .bind(sessionId)
    .first<{
      session_id: string;
      id: string;
      email: string | null;
      oura_user_id: string | null;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    oura_user_id: row.oura_user_id,
  };
}

export async function createSession(
  env: Env,
  userId: string,
): Promise<string> {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET not configured");
  }
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES (?, ?, datetime('now', '+${SESSION_TTL_SECONDS} seconds'))`,
  )
    .bind(sessionId, userId)
    .run();
  return signSessionId(sessionId, env.SESSION_SECRET);
}

export async function destroySession(
  request: Request,
  env: Env,
): Promise<void> {
  if (!env.SESSION_SECRET) return;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionId = await readSignedSessionId(
    cookies[SESSION_COOKIE],
    env.SESSION_SECRET,
  );
  if (!sessionId) return;
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?")
    .bind(sessionId)
    .run();
}

export async function saveTokenBundle(
  env: Env,
  userId: string,
  bundle: TokenBundle,
): Promise<void> {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  }
  const { iv, ciphertext } = await encryptJson(env.TOKEN_ENCRYPTION_KEY, bundle);
  await env.DB.prepare(
    `INSERT INTO encrypted_tokens (user_id, ciphertext, iv, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       iv = excluded.iv,
       updated_at = excluded.updated_at`,
  )
    .bind(userId, ciphertext, iv)
    .run();
}

export async function loadTokenBundle(
  env: Env,
  userId: string,
): Promise<TokenBundle | null> {
  if (!env.TOKEN_ENCRYPTION_KEY) return null;
  const row = await env.DB.prepare(
    "SELECT ciphertext, iv FROM encrypted_tokens WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ ciphertext: string; iv: string }>();
  if (!row) return null;
  return decryptJson<TokenBundle>(
    env.TOKEN_ENCRYPTION_KEY,
    row.iv,
    row.ciphertext,
  );
}

export function tokensToBundle(tokens: OuraTokens): TokenBundle {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
}

export async function getValidAccessToken(
  env: Env,
  userId: string,
): Promise<string> {
  const clientId = env.OURA_CLIENT_ID;
  const clientSecret = env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Oura client credentials not configured");
  }

  const bundle = await loadTokenBundle(env, userId);
  if (!bundle) {
    const err = new Error("no_tokens");
    err.name = "AuthRequired";
    throw err;
  }

  if (bundle.expires_at - ACCESS_TOKEN_REFRESH_SKEW_MS > Date.now()) {
    return bundle.access_token;
  }

  try {
    const refreshed = await refreshAccessToken({
      refreshToken: bundle.refresh_token,
      clientId,
      clientSecret,
    });
    const next = tokensToBundle(refreshed);
    await saveTokenBundle(env, userId, next);
    return next.access_token;
  } catch (cause) {
    await env.DB.prepare("DELETE FROM encrypted_tokens WHERE user_id = ?")
      .bind(userId)
      .run();
    const err = new Error("token_refresh_failed");
    err.name = "AuthRequired";
    err.cause = cause;
    throw err;
  }
}
