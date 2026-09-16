<script lang="ts">
  import { onMount } from "svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import LandingView from "./components/LandingView.svelte";
  import { isDevLoginAllowed, type MeResponse } from "./lib/types";

  const API_UNREACHABLE = "无法连接 API，请稍后重试。";

  let me = $state<MeResponse | null>(null);
  let loginError = $state("");
  let booted = $state(false);

  function loggedOutMe(): MeResponse {
    return {
      authenticated: false,
      source: null,
      userId: null,
      allowDevLogin: false,
      oauthConfigured: false,
    };
  }

  function withExplicitDevLogin(data: MeResponse): MeResponse {
    return { ...data, allowDevLogin: isDevLoginAllowed(data.allowDevLogin) };
  }

  function publicLoginError(raw: string): string {
    const text = raw.trim();
    if (!text) return "";
    if (/pnpm|dev:api|请先运行/i.test(text)) return API_UNREACHABLE;
    return text;
  }

  function urlLoginError(): string {
    const params = new URLSearchParams(location.search);
    const error = params.get("error");
    if (!error) return "";
    const hint = params.get("hint") ?? params.get("detail") ?? "";
    return publicLoginError(hint ? `${error} — ${hint}` : error);
  }

  function asMeResponse(value: unknown): MeResponse | null {
    if (!value || typeof value !== "object") return null;
    const rec = value as Record<string, unknown>;
    if (typeof rec.authenticated !== "boolean") return null;
    const source = rec.source === "oauth" || rec.source === "dev" ? rec.source : null;
    return withExplicitDevLogin({
      authenticated: rec.authenticated,
      source,
      userId: typeof rec.userId === "string" ? rec.userId : null,
      allowDevLogin: rec.allowDevLogin === true,
      oauthConfigured: rec.oauthConfigured === true,
    });
  }

  async function readMeResponse(res: Response): Promise<MeResponse | null> {
    try {
      const text = await res.text();
      if (!text || text.trimStart().startsWith("<")) return null;
      return asMeResponse(JSON.parse(text) as unknown);
    } catch {
      return null;
    }
  }

  function showLogin(next?: MeResponse, extraError = "") {
    me = next ? withExplicitDevLogin(next) : loggedOutMe();
    loginError = extraError ? publicLoginError(extraError) : urlLoginError();
  }

  async function boot() {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await readMeResponse(res);
      if (!data || !data.authenticated) {
        // Missing Worker / non-JSON / 404: public landing, no first-paint banner.
        showLogin(data ?? loggedOutMe());
        return;
      }
      me = data;
      loginError = "";
    } catch {
      showLogin(loggedOutMe());
    } finally {
      booted = true;
    }
  }

  onMount(() => {
    void boot();
  });

  $effect(() => {
    document.title = me?.authenticated
      ? "健康看板"
      : "Oura 健康看板";
  });
</script>

{#if !booted}
  <div class="status" style="padding:24px">正在加载…</div>
{:else if me?.authenticated}
  <Dashboard {me} onUnauthorized={() => showLogin()} />
{:else}
  <LandingView allowDevLogin={isDevLoginAllowed(me?.allowDevLogin)} error={loginError} />
{/if}
