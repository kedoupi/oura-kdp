import type { Env } from "../env";
import { DEFAULT_SCOPES, OURA_AUTH_URL } from "../lib/oura";

/** GET /api/auth/oura/start — redirect to Oura OAuth authorize. */
export function handleOuraStart(request: Request, env: Env): Response {
  const url = new URL(request.url);
  const clientId = env.OURA_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      {
        error: "OURA_CLIENT_ID not configured",
        hint: "Set Worker secrets / .dev.vars — see .env.example",
      },
      { status: 503 },
    );
  }

  const redirectUri =
    env.OURA_REDIRECT_URI ??
    `${url.origin}/api/auth/oura/callback`;

  // TODO: generate & store CSRF `state` in D1 / encrypted cookie
  const state = crypto.randomUUID();

  const auth = new URL(OURA_AUTH_URL);
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", DEFAULT_SCOPES);
  auth.searchParams.set("state", state);

  return Response.redirect(auth.toString(), 302);
}

/** GET /api/auth/oura/callback — exchange code, persist encrypted refresh token. */
export async function handleOuraCallback(
  request: Request,
  _env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return Response.json({ error: err }, { status: 400 });
  }
  if (!code || !state) {
    return Response.json({ error: "missing code or state" }, { status: 400 });
  }

  // TODO:
  // 1. Verify state
  // 2. exchangeCodeForTokens(...)
  // 3. Encrypt refresh_token with TOKEN_ENCRYPTION_KEY → D1
  // 4. Create session cookie (SESSION_SECRET)
  // 5. Redirect to frontend /

  return Response.json({
    ok: false,
    stub: true,
    message: "OAuth callback stub — wire token exchange + D1 next",
    received: { code: code.slice(0, 6) + "…", state },
  });
}
