import type { Env } from "../env";
import { buildStubDaily } from "../lib/mock";

/** GET /api/me/daily?days=7|30|90 — personal daily series (stub until OAuth). */
export async function handleMeDaily(
  request: Request,
  _env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get("days") ?? "30");
  const days = [7, 30, 90].includes(raw) ? raw : 30;

  // TODO: require session → load encrypted refresh token → Oura API → map series
  const body = buildStubDaily(days);

  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
