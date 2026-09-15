/**
 * Oura Cloud API — OAuth + daily collection helpers.
 * Docs: https://cloud.ouraring.com/docs/authentication
 * V2 daily: https://cloud.ouraring.com/v2/docs
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

export type OuraPersonalInfo = {
  id: string;
  email?: string | null;
};

export type OuraDailyRow = {
  day: string;
  score: number | null;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type CollectionResponse = {
  data?: Array<{ day?: string; score?: number | null }>;
  next_token?: string | null;
};

function parseTokens(body: TokenResponse): OuraTokens {
  if (!body.access_token || !body.refresh_token || !body.expires_in) {
    throw new Error(body.error_description || body.error || "invalid token response");
  }
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in,
  };
}

async function postToken(params: URLSearchParams): Promise<OuraTokens> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params,
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok) {
    throw new Error(
      body.error_description || body.error || `Oura token HTTP ${res.status}`,
    );
  }
  return parseTokens(body);
}

export async function exchangeCodeForTokens(args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OuraTokens> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: args.clientId,
    client_secret: args.clientSecret,
  });
  return postToken(params);
}

export async function refreshAccessToken(args: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<OuraTokens> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
    client_id: args.clientId,
    client_secret: args.clientSecret,
  });
  return postToken(params);
}

export async function fetchPersonalInfo(
  accessToken: string,
): Promise<OuraPersonalInfo> {
  const res = await fetch(`${OURA_API_BASE}/personal_info`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Oura personal_info HTTP ${res.status}`);
  }
  const body = (await res.json()) as { id?: string; email?: string | null };
  if (!body.id) throw new Error("Oura personal_info missing id");
  return { id: body.id, email: body.email ?? null };
}

async function fetchCollection(
  path: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraDailyRow[]> {
  const rows: OuraDailyRow[] = [];
  let nextToken: string | null = null;

  do {
    const url = new URL(`${OURA_API_BASE}/${path}`);
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    if (nextToken) url.searchParams.set("next_token", nextToken);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Oura ${path} HTTP ${res.status}`);
    }
    const body = (await res.json()) as CollectionResponse;
    for (const item of body.data ?? []) {
      if (!item.day) continue;
      rows.push({
        day: item.day,
        score: typeof item.score === "number" ? item.score : null,
      });
    }
    nextToken = body.next_token ?? null;
  } while (nextToken);

  return rows;
}

export async function fetchDailySummaries(args: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<{
  sleep: OuraDailyRow[];
  readiness: OuraDailyRow[];
  activity: OuraDailyRow[];
}> {
  const { accessToken, startDate, endDate } = args;
  const [sleep, readiness, activity] = await Promise.all([
    fetchCollection("daily_sleep", accessToken, startDate, endDate),
    fetchCollection("daily_readiness", accessToken, startDate, endDate),
    fetchCollection("daily_activity", accessToken, startDate, endDate),
  ]);
  return { sleep, readiness, activity };
}
