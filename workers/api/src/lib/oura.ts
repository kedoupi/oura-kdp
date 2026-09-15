/**
 * Oura Cloud API helpers — stubs for skeleton.
 * Real flow: exchange code → store encrypted refresh_token → pull daily sleep/readiness/activity.
 * Docs: https://cloud.ouraring.com/docs/
 */

export const OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
export const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
export const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

/** Default scopes: sleep / readiness / activity (+ email for account identity). */
export const DEFAULT_SCOPES = "daily personal email";

export type OuraTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function exchangeCodeForTokens(_args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OuraTokens> {
  // TODO: POST OURA_TOKEN_URL with grant_type=authorization_code
  throw new Error("Oura token exchange not implemented in skeleton");
}

export async function refreshAccessToken(_args: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<OuraTokens> {
  // TODO: POST OURA_TOKEN_URL with grant_type=refresh_token
  throw new Error("Oura token refresh not implemented in skeleton");
}

export async function fetchDailySummaries(_args: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<unknown> {
  // TODO: GET sleep / daily_readiness / daily_activity from OURA_API_BASE
  throw new Error("Oura daily fetch not implemented in skeleton");
}
