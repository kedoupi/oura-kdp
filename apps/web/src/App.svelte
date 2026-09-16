<script lang="ts">
  import { onMount } from "svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import LandingView from "./components/LandingView.svelte";
  import type { MeResponse } from "./lib/types";

  let me = $state<MeResponse | null>(null);
  let loginError = $state("");
  let booted = $state(false);

  function showLogin(next?: MeResponse, extraError = "") {
    me = next ?? {
      authenticated: false,
      source: null,
      userId: null,
      allowDevLogin: true,
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
      me = data;
      loginError = "";
    } catch {
      showLogin(
        {
          authenticated: false,
          source: null,
          userId: null,
          allowDevLogin: true,
          oauthConfigured: false,
        },
        "无法连接 API。请先运行 pnpm dev（或 pnpm dev:api）。",
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
      : "oura.kdp.cool · Oura 睡眠 · 准备度 · 活动";
  });
</script>

{#if !booted}
  <div class="status" style="padding:24px">正在加载…</div>
{:else if me?.authenticated}
  <Dashboard {me} onUnauthorized={() => showLogin()} />
{:else}
  <LandingView allowDevLogin={me?.allowDevLogin ?? true} error={loginError} />
{/if}
