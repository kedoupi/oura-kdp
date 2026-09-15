import type { Env } from "../env";
import { json } from "../lib/http";
import { getSessionUser } from "../lib/session";

/** GET /api/me — current session user, or authenticated:false. */
export async function handleMe(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) {
    return json({ authenticated: false });
  }
  return json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
