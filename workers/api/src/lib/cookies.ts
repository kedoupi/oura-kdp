import { SESSION_COOKIE } from "../env";

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

export function sessionCookieHeader(
  value: string,
  opts: { maxAge: number; secure: boolean },
): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${opts.maxAge}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(secure: boolean): string {
  return sessionCookieHeader("", { maxAge: 0, secure });
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}
