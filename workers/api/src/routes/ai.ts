import type { Env } from "../env";
import {
  jsonError,
  resolveSessionSecret,
} from "../lib/config";
import { clampDays } from "../lib/daily";
import { readSessionFromRequest } from "../lib/session";

const DEV_AI_UPSTREAM = "https://api.xiaotaozi.cc/oura/ai";

/**
 * GET /api/me/ai?days=7|30|90&now=ISO
 * Session-gated. DEV may proxy the personal /oura/ai; otherwise a clear stub.
 */
export async function handleMeAi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const days = clampDays(Number(url.searchParams.get("days") ?? "7"));
  const now = url.searchParams.get("now") ?? new Date().toISOString();

  const secret = resolveSessionSecret(request, env);
  if (!secret) {
    return jsonError("SESSION_SECRET not configured", 503);
  }

  const session = await readSessionFromRequest(request, env, secret);
  if (!session) {
    return jsonError("unauthorized", 401, {
      hint: "Login with Oura, or GET /api/auth/dev/session on localhost",
    });
  }

  const headers = { "Cache-Control": "no-store" };

  if (session.kind === "dev") {
    try {
      const upstream = new URL(DEV_AI_UPSTREAM);
      upstream.searchParams.set("user_id", "kedoupi");
      upstream.searchParams.set("days", String(days));
      upstream.searchParams.set("now", now);
      const res = await fetch(upstream.toString(), {
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (res.ok && data && data.ok) {
        return Response.json({ ...data, source: "dev-proxy" }, { headers });
      }
    } catch {
      // fall through to stub
    }
  }

  return Response.json(
    {
      ok: false,
      stub: true,
      error: "未接好",
      hint: "多人会话版 /api/me/ai 尚未接入模型。DEV 已尝试代理个人 /oura/ai。",
    },
    { status: 200, headers },
  );
}
