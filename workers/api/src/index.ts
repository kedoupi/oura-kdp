import type { Env } from "./env";
import { handleLogout, handleOuraCallback, handleOuraStart } from "./routes/auth";
import { handleMeDaily } from "./routes/daily";
import { handleMe } from "./routes/me";

function cors(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(request) });
    }

    try {
      let res: Response;
      switch (url.pathname) {
        case "/api/auth/oura/start":
          res = await handleOuraStart(request, env);
          break;
        case "/api/auth/oura/callback":
          res = await handleOuraCallback(request, env);
          break;
        case "/api/auth/logout":
          res = await handleLogout(request, env);
          break;
        case "/api/me":
          res = await handleMe(request, env);
          break;
        case "/api/me/daily":
          res = await handleMeDaily(request, env);
          break;
        case "/api/health":
          res = Response.json({ ok: true, service: "oura-kdp-api" });
          break;
        default:
          res = Response.json({ error: "not found" }, { status: 404 });
      }

      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(cors(request))) {
        if (!headers.has(k)) headers.set(k, v);
      }
      return new Response(res.body, { status: res.status, headers });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "internal error" },
        { status: 500, headers: cors(request) },
      );
    }
  },
} satisfies ExportedHandler<Env>;
