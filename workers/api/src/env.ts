export interface Env {
  DB: D1Database;
  OURA_CLIENT_ID?: string;
  OURA_CLIENT_SECRET?: string;
  OURA_REDIRECT_URI?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  SESSION_SECRET?: string;
  /** Post-login redirect origin, e.g. http://localhost:5173 or https://oura.kdp.cool */
  FRONTEND_ORIGIN?: string;
}

export const SESSION_COOKIE = "oura_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000;
