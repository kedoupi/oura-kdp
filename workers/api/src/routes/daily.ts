import type { Env } from "../env";
import { json } from "../lib/http";
import { fetchDailySummaries } from "../lib/oura";
import { dateRangeUtc, buildDailyPayload } from "../lib/series";
import { getSessionUser, getValidAccessToken } from "../lib/session";

/** GET /api/me/daily?days=7|30|90 — personal daily series (session required). */
export async function handleMeDaily(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) {
    return json({ error: "unauthorized", hint: "Sign in with Oura first" }, 401);
  }

  const url = new URL(request.url);
  const raw = Number(url.searchParams.get("days") ?? "30");
  const days = [7, 30, 90].includes(raw) ? raw : 30;

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(env, user.id);
  } catch (err) {
    if (err instanceof Error && err.name === "AuthRequired") {
      return json(
        { error: "reauth_required", hint: "Reconnect Oura — refresh token is missing or expired" },
        401,
      );
    }
    throw err;
  }

  const dates = dateRangeUtc(days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const summaries = await fetchDailySummaries({
    accessToken,
    startDate,
    endDate,
  });

  const body = buildDailyPayload({
    days,
    sleep: summaries.sleep,
    readiness: summaries.readiness,
    activity: summaries.activity,
  });

  return json({
    ...body,
    user: { id: user.id, email: user.email },
  });
}
