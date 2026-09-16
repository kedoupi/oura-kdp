<script lang="ts">
  let {
    isDev,
    aiBusy,
    onAi,
    onLogout,
  }: {
    isDev: boolean;
    aiBusy: boolean;
    onAi: () => void;
    onLogout: () => void;
  } = $props();
</script>

<header class="chrome">
  <div class="chrome-inner">
    <a class="brand" href="/">珂抖屁</a>
    <nav class="nav">
      <a class="active" href="/">健康</a>
      <button type="button" class="ai-btn" disabled={aiBusy} onclick={onAi}>AI 分析</button>
      {#if isDev}
        <span class="ver-chip">DEV 演示</span>
      {/if}
      <button type="button" class="ai-btn" onclick={onLogout}>退出</button>
    </nav>
  </div>
</header>
