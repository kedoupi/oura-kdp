export interface Env {
  DB: D1Database;
  OURA_CLIENT_ID?: string;
  OURA_CLIENT_SECRET?: string;
  OURA_REDIRECT_URI?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  SESSION_SECRET?: string;
}
