import type { Env } from "../env";

export function json(
  body: unknown,
  status = 200,
  extra?: HeadersInit,
): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

export function frontendOrigin(request: Request, env: Env): string {
  const configured = env.FRONTEND_ORIGIN?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export function frontendRedirect(
  request: Request,
  env: Env,
  query?: Record<string, string>,
): Response {
  const dest = new URL("/", `${frontendOrigin(request, env)}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) dest.searchParams.set(k, v);
  }
  return Response.redirect(dest.toString(), 302);
}

export function missingSecrets(env: Env, keys: (keyof Env)[]): string[] {
  return keys.filter((k) => {
    const v = env[k];
    return typeof v !== "string" || v.trim() === "";
  }) as string[];
}

export const SETUP_HINT =
  "Create an Oura API app at https://cloud.ouraring.com/oauth/applications, then set Worker secrets (or workers/api/.dev.vars). See README.md § Oura OAuth setup.";
