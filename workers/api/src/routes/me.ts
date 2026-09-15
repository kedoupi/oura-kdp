import type { Env } from "../env";
import {
  allowDevLogin,
  jsonError,
  oauthConfigured,
  resolveSessionSecret,
} from "../lib/config";
import { readSessionFromRequest } from "../lib/session";

/** GET /api/me — session status for the login gate. */
export async function handleMe(request: Request, env: Env): Promise<Response> {
  const secret = resolveSessionSecret(request, env);
  if (!secret) {
    return jsonError("SESSION_SECRET not configured", 503);
  }

  const session = await readSessionFromRequest(request, env, secret);
  return Response.json({
    authenticated: Boolean(session),
    source: session?.kind ?? null,
    userId: session?.user_id ?? null,
    allowDevLogin: allowDevLogin(request, env),
    oauthConfigured: oauthConfigured(env),
  });
}
