<script lang="ts">
  let {
    allowDevLogin,
    error,
  }: {
    allowDevLogin: boolean;
    error: string;
  } = $props();

  function loginOura() {
    window.location.href = "/api/auth/oura/start";
  }

  function loginDev() {
    window.location.href = "/api/auth/dev/session";
  }
</script>

<section id="login-view" class="login-view">
  <div class="login-card">
    <h1>oura.kdp.cool</h1>
    <p class="sub">用 Oura 登录后查看睡眠 · 准备度 · 活动</p>
    <button class="btn primary" type="button" onclick={loginOura}>用 Oura 登录</button>
    {#if allowDevLogin}
      <button class="btn ghost" type="button" onclick={loginDev}>DEV 演示登录</button>
    {/if}
    {#if error}
      <p class="status err">{error}</p>
    {/if}
    <p class="hint login-hint">
      登录会跳转到 <code>cloud.ouraring.com/oauth/authorize</code>。
      本地无真实密钥时可用 DEV 演示登录；DEV 日数据来自 kedoupi 个人看板真实样本，不是编造序列。
    </p>
  </div>
</section>
