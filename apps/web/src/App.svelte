<script lang="ts">
  import { onMount } from "svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import LandingView from "./components/LandingView.svelte";
  import { isDevLoginAllowed, type MeResponse } from "./lib/types";

  let me = $state<MeResponse | null>(null);
  let loginError = $state("");
  let booted = $state(false);

  function withExplicitDevLogin(data: MeResponse): MeResponse {
    return { ...data, allowDevLogin: isDevLoginAllowed(data.allowDevLogin) };
  }

  function showLogin(next?: MeResponse, extraError = "") {
    me = next
      ? withExplicitDevLogin(next)
      : {
          authenticated: false,
          source: null,
          userId: null,
          allowDevLogin: false,
          oauthConfigured: false,
        };
    const params = new URLSearchParams(location.search);
    const error = params.get("error");
    if (extraError) {
      loginError = extraError;
    } else if (error) {
      const hint = params.get("hint") ?? params.get("detail") ?? "";
      loginError = hint ? `${error} — ${hint}` : error;
    } else {
      loginError = "";
    }
  }

  async function boot() {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MeResponse;
      if (!data.authenticated) {
        showLogin(data);
        return;
      }
      me = withExplicitDevLogin(data);
      loginError = "";
    } catch {
      showLogin(
        {
          authenticated: false,
          source: null,
          userId: null,
          allowDevLogin: false,
          oauthConfigured: false,
        },
        "无法连接 API，请稍后重试。",
      );
    } finally {
      booted = true;
    }
  }

  onMount(() => {
    void boot();
  });

  $effect(() => {
    document.title = me?.authenticated
      ? "健康看板 · 珂抖屁"
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
